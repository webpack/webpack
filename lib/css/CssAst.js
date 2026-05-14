/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../util/LocConverter")} LocConverter */
/** @typedef {import("./walkCssTokens").CssToken} CssToken */

// AST shape mirrors https://github.com/tabatkins/parse-css, which is the
// reference implementation of the CSS Syntax Level 3 algorithms
// (https://www.w3.org/TR/css-syntax-3/). Spec section anchors are linked
// from the relevant helpers below; the integer steps in `parseADeclaration`
// match the spec's "consume a declaration" algorithm one-for-one.
//
// Two intentional deviations from parse-css:
//   1. Nodes carry `start`/`end` byte offsets and expose a lazy `loc` getter
//      via a shared `LocConverter`. parse-css drops location info above the
//      token layer; webpack needs spans for warning/error messages.
//   2. Nodes have **no** methods other than the `loc` getter — no `toJSON`,
//      no `toSource`. We don't need round-tripping; we walk the tree to feed
//      our dependency emitters and that's it.

const CC_COLON = ":".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);
const CC_LEFT_SQUARE_BRACKET = "[".charCodeAt(0);
const CC_LEFT_CURLY_BRACKET = "{".charCodeAt(0);
const CC_RIGHT_CURLY_BRACKET = "}".charCodeAt(0);
const CC_EXCLAMATION = "!".charCodeAt(0);
const CC_AT_SIGN = "@".charCodeAt(0);

// Token / node `type` discriminators. Naming follows the spec where it has
// a name, otherwise parse-css's lowercase kebab style.
const T_IDENT = "ident";
const T_FUNCTION = "function";
const T_AT_KEYWORD = "at-keyword";
const T_HASH = "hash";
const T_STRING = "string";
const T_BAD_STRING = "bad-string";
const T_URL = "url";
const T_BAD_URL = "bad-url";
const T_DELIM = "delim";
const T_NUMBER = "number";
const T_PERCENTAGE = "percentage";
const T_DIMENSION = "dimension";
const T_WHITESPACE = "whitespace";
const T_COLON = "colon";
const T_SEMICOLON = "semicolon";
const T_COMMA = "comma";
const T_SIMPLE_BLOCK = "simple-block";
const T_DECLARATION = "declaration";
const T_AT_RULE = "at-rule";

/**
 * Base AST node. All concrete nodes (tokens, simple blocks, functions,
 * declarations) inherit from this and carry the [start, end) byte range
 * of the source slice they cover. `loc` is computed on demand from a
 * shared `LocConverter` so we don't pay for line/column conversion until
 * a consumer (warning, error, dependency) actually needs it.
 */
class Node {
	/**
	 * @param {string} type node type discriminator
	 * @param {number} start start offset (inclusive)
	 * @param {number} end end offset (exclusive)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, start, end, locConverter) {
		this.type = type;
		this.start = start;
		this.end = end;
		this._locConverter = locConverter;
	}

	get loc() {
		const lc = this._locConverter;
		// `LocConverter#get` mutates and returns the converter itself, so we
		// must snapshot `line`/`column` between the two calls.
		const s = lc.get(this.start);
		const sl = s.line;
		const sc = s.column;
		const e = lc.get(this.end);
		return {
			start: { line: sl, column: sc },
			end: { line: e.line, column: e.column }
		};
	}
}

/**
 * Leaf token node. `value` is the raw source slice of the token (e.g. the
 * identifier text, the quoted string including quotes, the dimension's full
 * `123px`). Token-specific extras (hash id-flag, url content range) live on
 * subclasses to keep the common case lean.
 */
class Token extends Node {
	/**
	 * @param {string} type node type
	 * @param {string} value raw source slice
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(type, value, start, end, locConverter) {
		super(type, start, end, locConverter);
		this.value = value;
	}
}

/**
 * Hash token (`#foo`). `value` is the name without the leading `#`. `id` is
 * the spec's type-flag — true when the name forms a valid `<id>` selector.
 */
class HashToken extends Token {
	/**
	 * @param {string} value name without leading `#`
	 * @param {boolean} id true when this is an id-style hash
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(value, id, start, end, locConverter) {
		super(T_HASH, value, start, end, locConverter);
		this.id = id;
	}
}

/**
 * Old-style URL token from the tokenizer (`url(unquoted)`). `value` is the
 * unquoted contents; `contentStart`/`contentEnd` mark the inner range in the
 * original source.
 */
class UrlToken extends Token {
	/**
	 * @param {string} value unquoted url body
	 * @param {number} contentStart start offset of the inner content
	 * @param {number} contentEnd end offset of the inner content
	 * @param {number} start start offset (including `url(`)
	 * @param {number} end end offset (including closing `)`)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(value, contentStart, contentEnd, start, end, locConverter) {
		super(T_URL, value, start, end, locConverter);
		this.contentStart = contentStart;
		this.contentEnd = contentEnd;
	}
}

/**
 * Function node: `name(component-values...)`. `name` is the raw source slice
 * before the `(` (callers lowercase / unescape as needed). `nameRange` is
 * `[start, end)` of the name token. `value` is the list of component values
 * inside the parentheses.
 */
class FunctionNode extends Node {
	/**
	 * @param {string} name raw source slice of the name (no `(`)
	 * @param {[number, number]} nameRange name [start, end)
	 * @param {Node[]} value component values inside `(...)`
	 * @param {number} start start offset (`name` start)
	 * @param {number} end end offset (after `)` or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(name, nameRange, value, start, end, locConverter) {
		super(T_FUNCTION, start, end, locConverter);
		this.name = name;
		this.nameRange = nameRange;
		this.value = value;
	}
}

/** @typedef {"[" | "(" | "{"} SimpleBlockToken */

/**
 * Simple block (`[...]`, `(...)` not preceded by an ident, `{...}`).
 * `token` is the opening character (`[`, `(`, `{`).
 */
class SimpleBlock extends Node {
	/**
	 * @param {SimpleBlockToken} token opening character
	 * @param {Node[]} value component values inside the block
	 * @param {number} start start offset (the opening character)
	 * @param {number} end end offset (after closing character or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(token, value, start, end, locConverter) {
		super(T_SIMPLE_BLOCK, start, end, locConverter);
		this.token = token;
		this.value = value;
	}
}

/**
 * Declaration: `name: value [!important][;]`. `value` is the trimmed list of
 * component values (whitespace stripped from both ends; `!important` removed
 * and recorded as `important: true`).
 */
class Declaration extends Node {
	/**
	 * @param {string} name raw source slice of the property name
	 * @param {[number, number]} nameRange name [start, end)
	 * @param {Node[]} value list of component values
	 * @param {boolean} important whether the declaration carried `!important`
	 * @param {number} start start offset (first non-whitespace byte)
	 * @param {number} end end offset (the terminating `;`/`}` position, or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(name, nameRange, value, important, start, end, locConverter) {
		super(T_DECLARATION, start, end, locConverter);
		this.name = name;
		this.nameRange = nameRange;
		this.value = value;
		this.important = important;
	}
}

/** @typedef {";" | "{" | "}" | null} AtRuleTerminator */

/**
 * At-rule: `@name <prelude> ;` or `@name <prelude> { ... }`. `prelude` is the
 * list of component values between the `@-keyword` and the terminator
 * (whitespace preserved — callers strip as needed). The block (`{...}`) is
 * **not** consumed by `parseAtRule`; `terminator` tells the caller what
 * stopped the prelude so the outer parser can fire the matching callback
 * (`semicolon:` for `;`-terminated at-rules, `leftCurlyBracket:` to enter a
 * block at-rule). When `parseABlocksContents` walks a block, it fills in
 * `.block` for terminator-`{` at-rules and updates `.end` to point past `}`.
 */
class AtRule extends Node {
	/**
	 * @param {string} name at-keyword name without the leading `@`
	 * @param {[number, number]} nameRange `[start, end)` of the at-keyword token (range includes `@`)
	 * @param {Node[]} prelude list of component values up to the terminator
	 * @param {AtRuleTerminator} terminator token that ended the prelude — `;`, `{` for a block, `}` for an unmatched close-curly, or null for EOF
	 * @param {number} start start offset (the `@`)
	 * @param {number} end end offset (the terminator's position, or EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(name, nameRange, prelude, terminator, start, end, locConverter) {
		super(T_AT_RULE, start, end, locConverter);
		this.name = name;
		this.nameRange = nameRange;
		this.prelude = prelude;
		this.terminator = terminator;
		/**
		 * Optional block body, populated only when the at-rule was consumed
		 * by `parseABlocksContents` / `parseAStylesheet`. `parseAtRule`
		 * itself leaves this `null`.
		 * @type {SimpleBlock | null}
		 */
		this.block = null;
	}
}

/**
 * Qualified rule: `<prelude> { <block> }`. The prelude is the list of
 * component values before the `{` (selectors in a style rule, parameters in
 * a keyframe rule, …). `block` is the simple-block `{ ... }` that follows.
 * Per spec, a qualified rule with no block (EOF before `{`) is a parse
 * error and dropped; we still return such partial rules with `block: null`
 * so callers can decide whether to recover.
 */
class QualifiedRule extends Node {
	/**
	 * @param {Node[]} prelude list of component values before the `{`
	 * @param {SimpleBlock | null} block the `{ ... }` body, or null when EOF was hit before `{`
	 * @param {number} start start offset (first byte of the prelude)
	 * @param {number} end end offset (past `}` if the block was consumed, otherwise EOF)
	 * @param {LocConverter} locConverter shared loc converter
	 */
	constructor(prelude, block, start, end, locConverter) {
		super("qualified-rule", start, end, locConverter);
		this.prelude = prelude;
		this.block = block;
	}
}

/** @typedef {"root" | "function" | SimpleBlockToken} FrameKind */

/**
 * @typedef {object} Frame
 * @property {FrameKind} kind frame kind
 * @property {string} name function name (only meaningful when kind === "function")
 * @property {[number, number] | null} nameRange name range (function only)
 * @property {Node[]} values component values inside this frame
 * @property {number} start frame start offset
 */

/**
 * Materialize a closed frame as the appropriate AST node.
 * @param {Frame} frame frame to close
 * @param {number} end end offset of the closing token (or implicit close at EOF)
 * @param {LocConverter} locConverter shared loc converter
 * @returns {FunctionNode | SimpleBlock} closed node
 */
const _frameToNode = (frame, end, locConverter) => {
	if (frame.kind === "function") {
		return new FunctionNode(
			frame.name,
			/** @type {[number, number]} */ (frame.nameRange),
			frame.values,
			frame.start,
			end,
			locConverter
		);
	}
	return new SimpleBlock(
		/** @type {"[" | "(" | "{"} */ (frame.kind),
		frame.values,
		frame.start,
		end,
		locConverter
	);
};

/**
 * Apply a single `CssToken` to the AST-building `stack`, pushing tokens as
 * `Token` / `HashToken` / `UrlToken` nodes into the top frame's `values`,
 * opening a new frame on `(` / `[` / `{` / function-token, and closing on
 * `)` / `]` (curly braces are entry-point-specific and handled by the
 * caller, as are comma / semicolon / comment, plus any terminator tokens
 * the consumer needs to stop at).
 *
 * `onRootClose` fires when a closing `)` / `]` empties the stack —
 * `_consumeIntoSeedFrame` uses it to record the materialized seed node;
 * the sentinel-root entry-points (`parseAListOfComponentValues`,
 * `parseAComponentValue`) ignore it because they intercept `)` / `]` in
 * their own switch arms to preserve the sentinel.
 * @param {CssToken} t token from the `walkCssTokens` iterator
 * @param {string} input source
 * @param {LocConverter} locConverter shared loc converter
 * @param {Frame[]} stack frame stack — top frame is mutated
 * @param {(frame: Frame, end: number) => void} onRootClose called when the stack drops to empty after a `)` / `]` close
 * @returns {void}
 */
const pushTokenAsNode = (t, input, locConverter, stack, onRootClose) => {
	const top = stack[stack.length - 1];
	switch (t.type) {
		case "whitespace":
			top.values.push(
				new Token(
					T_WHITESPACE,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "identifier":
			top.values.push(
				new Token(
					T_IDENT,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "string":
			top.values.push(
				new Token(
					T_STRING,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "delim":
			top.values.push(
				new Token(
					T_DELIM,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "number":
			top.values.push(
				new Token(
					T_NUMBER,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "percentage":
			top.values.push(
				new Token(
					T_PERCENTAGE,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "dimension":
			top.values.push(
				new Token(
					T_DIMENSION,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "hash":
			top.values.push(
				new HashToken(
					input.slice(t.start + 1, t.end),
					t.isId,
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "atKeyword":
			top.values.push(
				new Token(
					T_AT_KEYWORD,
					input.slice(t.start + 1, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "url":
			top.values.push(
				new UrlToken(
					input.slice(t.contentStart, t.contentEnd),
					t.contentStart,
					t.contentEnd,
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "badStringToken":
			top.values.push(
				new Token(
					T_BAD_STRING,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "badUrlToken":
			top.values.push(
				new Token(
					T_BAD_URL,
					input.slice(t.start, t.end),
					t.start,
					t.end,
					locConverter
				)
			);
			return;
		case "colon":
			top.values.push(new Token(T_COLON, ":", t.start, t.end, locConverter));
			return;
		case "comma":
			top.values.push(new Token(T_COMMA, ",", t.start, t.end, locConverter));
			return;
		case "function":
			// `t.end` points just past the `(`; the name occupies [start, end - 1).
			stack.push({
				values: [],
				kind: "function",
				name: input.slice(t.start, t.end - 1),
				nameRange: [t.start, t.end - 1],
				start: t.start
			});
			return;
		case "leftParenthesis":
			stack.push({
				values: [],
				kind: "(",
				name: "",
				nameRange: null,
				start: t.start
			});
			return;
		case "leftSquareBracket":
			stack.push({
				values: [],
				kind: "[",
				name: "",
				nameRange: null,
				start: t.start
			});
			return;
		case "leftCurlyBracket":
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: t.start
			});
			return;
		case "rightParenthesis": {
			// Close a `function` or `(` frame; a stray `)` with no matching
			// open is silently dropped to match parse-css's recovery.
			if (stack.length === 0) return;
			const frame = /** @type {Frame} */ (stack.pop());
			const node = _frameToNode(frame, t.end, locConverter);
			if (stack.length === 0) {
				onRootClose(frame, t.end);
			} else {
				stack[stack.length - 1].values.push(node);
			}
			return;
		}
		case "rightSquareBracket": {
			if (stack.length === 0 || top.kind !== "[") return;
			const frame = /** @type {Frame} */ (stack.pop());
			const node = _frameToNode(frame, t.end, locConverter);
			if (stack.length === 0) {
				onRootClose(frame, t.end);
				return;
			}
			stack[stack.length - 1].values.push(node);
			break;
		}
		default:
		// `comment`, `semicolon`, `leftCurlyBracket` (terminator for some
		// entry-points), `rightCurlyBracket`, `cdo`, `cdc` — each consumer
		// handles these in its own switch and never calls this helper for
		// them. Unknown types fall through silently.
	}
};

/** @typedef {";" | "{" | "}" | null} ListTerminator */

/**
 * @typedef {object} ParseListOptions
 * @property {boolean=} stopAtSemicolon top-level `<semicolon-token>` terminates the list (not consumed). Used by declaration-value and at-rule-prelude callers.
 * @property {boolean=} stopAtLeftCurly top-level `<{-token>` terminates the list (not consumed). Used by at-rule-prelude callers (the at-rule's block starts here).
 * @property {boolean=} stopAtRightCurly top-level `<}-token>` terminates the list (not consumed). Used by callers that sit inside a `{}` block — equivalent to spec §5.4.7's `nested=true` parameter.
 * @property {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the tokenizer so the outer parser's comment tracker still sees magic comments inside the consumed range
 */

/**
 * Parse a list of component values, per CSS Syntax Level 3
 * [§5.3.7](https://www.w3.org/TR/css-syntax-3/#parse-list-of-component-values)
 * (entry point) + [§5.4.7](https://www.w3.org/TR/css-syntax-3/#consume-list-of-components-values)
 * (consume algorithm). Nested simple blocks (`{}`, `[]`, `()`) and functions
 * are consumed recursively — semicolons, commas, and braces inside them
 * stay inside those frames' `value` arrays and do not terminate the outer
 * list.
 *
 * The spec gives `consume a list of component values` a single `stopToken`
 * plus a `nested` bool. Webpack's callers need slightly more flexibility
 * (declaration values stop at `;` *and* `}`; at-rule preludes stop at `;`,
 * `{`, *and* `}`; comma-separated splitting stops at `,`), so this function
 * exposes the same idea as three independent `stopAt…` flags. Unknown stop
 * tokens are passed through into the AST.
 *
 * Spec deviations: the spec emits a parse error when an unmatched
 * `<}-token>` is hit at top level with `nested=false`; we silently drop it
 * (the outer streaming walker recovers structurally). Unclosed simple
 * blocks / functions at EOF are implicitly closed, matching spec §5.4.9 /
 * §5.4.10 step 2.1.
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {ParseListOptions=} options stop-token flags and comment callback
 * @returns {{ values: Node[], end: number, terminator: ListTerminator }}
 * consumed component values, final position (the terminator's position
 * or EOF), and the kind of terminator that stopped the list
 */
const parseAListOfComponentValues = (
	input,
	pos,
	locConverter,
	options = {}
) => {
	const { stopAtSemicolon, stopAtLeftCurly, stopAtRightCurly, comment } =
		options;
	/** @type {Frame[]} */
	const stack = [
		{
			values: [],
			kind: "root",
			name: "",
			nameRange: null,
			start: pos
		}
	];
	/** @type {ListTerminator} */
	let terminator = null;
	const top = () => stack[stack.length - 1];
	// Root frame is a sentinel — `onRootClose` only fires if we pop
	// past it, which would mean an unmatched `)` / `]` at the top
	// level. `pushTokenAsNode` silently no-ops in that case, matching
	// parse-css's recovery, so this hook is unreachable in practice.
	/** @type {(frame: Frame, end: number) => void} */
	const onRootClose = () => {};

	let endPos = pos;
	for (const t of walkCssTokens(input, pos)) {
		endPos = t.end;
		if (t.type === "comment") {
			if (comment) comment(input, t.start, t.end);
			continue;
		}
		if (t.type === "semicolon") {
			if (stopAtSemicolon && stack.length === 1) {
				terminator = ";";
				endPos = t.start;
				break;
			}
			top().values.push(
				new Token(T_SEMICOLON, ";", t.start, t.end, locConverter)
			);
			continue;
		}
		if (t.type === "leftCurlyBracket") {
			if (stopAtLeftCurly && stack.length === 1) {
				terminator = "{";
				endPos = t.start;
				break;
			}
			// Nested `{` simple block.
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: t.start
			});
			continue;
		}
		if (t.type === "rightCurlyBracket") {
			if (stack.length > 1 && top().kind === "{") {
				// Close a nested `{` simple block.
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
				continue;
			}
			if (stopAtRightCurly) {
				terminator = "}";
				endPos = t.start;
				break;
			}
			// Spec §5.4.7: a top-level `}` with `nested=false` is a parse
			// error; the spec consumes it as a delim. We silently drop it
			// — the outer streaming walker handles structural recovery one
			// level up.
			continue;
		}
		pushTokenAsNode(t, input, locConverter, stack, onRootClose);
	}

	// EOF — implicitly close any frames left open, per spec §5.4.9 /
	// §5.4.10 step 2.1.
	while (stack.length > 1) {
		const frame = /** @type {Frame} */ (stack.pop());
		top().values.push(_frameToNode(frame, endPos, locConverter));
	}

	return { values: stack[0].values, end: endPos, terminator };
};

/**
 * Parse a comma-separated list of component values, per CSS Syntax Level 3
 * [§5.3.8](https://www.w3.org/TR/css-syntax-3/#parse-comma-list).
 * Convenience wrapper over `parseAListOfComponentValues` that splits the
 * result at top-level `<comma-token>`s into groups. Whitespace tokens
 * adjacent to commas are kept inside their groups (callers strip if they
 * care — `parseADeclaration`-style trailing/leading whitespace trimming is
 * a caller concern).
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {ParseListOptions=} options stop-token flags and comment callback
 * @returns {{ groups: Node[][], end: number, terminator: ListTerminator }}
 * comma-separated groups, final position, terminator kind
 */
const parseACommaSeparatedListOfComponentValues = (
	input,
	pos,
	locConverter,
	options = {}
) => {
	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		options
	);
	/** @type {Node[][]} */
	const groups = [];
	/** @type {Node[]} */
	let current = [];
	for (const cv of values) {
		if (cv.type === "comma") {
			groups.push(current);
			current = [];
			continue;
		}
		current.push(cv);
	}
	groups.push(current);
	return { groups, end, terminator };
};

/**
 * Parse a single component value, per CSS Syntax Level 3
 * [§5.3.6](https://www.w3.org/TR/css-syntax-3/#parse-component-value).
 * Discards leading whitespace and comments, then consumes exactly one
 * component value — a token, a simple block, or a function call. Returns
 * `undefined` if `pos` is at (or past) EOF after the whitespace skip.
 *
 * Implementation note: we stop the tokenizer the moment the root frame
 * receives a non-whitespace value (via `needTerminate`) instead of walking
 * to EOF and then taking the first value — important when this runs against
 * a long suffix of a source file (e.g. an at-rule prelude probe). Nested
 * `(`/`[`/`{`/function frames are consumed recursively before the
 * `needTerminate` check fires again, so the returned value is always a
 * complete sub-tree.
 *
 * Spec deviation: the spec also requires the *trailing* input to be empty
 * after consuming the value (else syntax error). We don't enforce that —
 * callers ask for one component value because they want to know what's
 * there; whatever follows is their concern. This matches the practical
 * shape webpack uses in its streaming walker.
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {{ comment?: (input: string, start: number, end: number) => number }=} options optional comment-token callback forwarded to the tokenizer
 * @returns {{ value: Node, end: number } | undefined} the parsed component
 * value and the position immediately after it, or `undefined` if the
 * input is empty after whitespace
 */
const parseAComponentValue = (input, pos, locConverter, options = {}) => {
	pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
	if (pos >= input.length) return undefined;

	/** @type {Frame[]} */
	const stack = [
		{
			values: [],
			kind: "root",
			name: "",
			nameRange: null,
			start: pos
		}
	];
	const top = () => stack[stack.length - 1];
	// `pushTokenAsNode` is shared with the seed-frame consumer below,
	// which uses `onRootClose` to record the seed node and stop. Here
	// the root is a sentinel — we intercept `rightParenthesis` /
	// `rightSquareBracket` in the loop's switch below so `pushTokenAsNode`
	// never sees a top-level close, and this hook is unreachable.
	/** @type {(frame: Frame, end: number) => void} */
	const onRootClose = () => {};

	// Helper: has the root frame captured any non-whitespace value?
	// Bail as soon as it has — nested frames keep `stack.length > 1`,
	// so the check only fires after a recursive block/function has
	// finished closing.
	const rootIsComplete = () => {
		if (stack.length !== 1) return false;
		for (const v of stack[0].values) {
			if (v.type !== "whitespace") return true;
		}
		return false;
	};

	let endPos = pos;
	for (const t of walkCssTokens(input, pos)) {
		endPos = t.end;
		if (t.type === "comment") {
			if (options.comment) options.comment(input, t.start, t.end);
			continue;
		}
		if (t.type === "semicolon") {
			top().values.push(
				new Token(T_SEMICOLON, ";", t.start, t.end, locConverter)
			);
			if (rootIsComplete()) break;
			continue;
		}
		if (t.type === "leftCurlyBracket") {
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: t.start
			});
			continue;
		}
		if (t.type === "rightCurlyBracket") {
			if (stack.length > 1 && top().kind === "{") {
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
			}
			// Top-level `}` is dropped (parse-error recovery); the outer
			// streaming walker handles structural recovery one level up.
			if (rootIsComplete()) break;
			continue;
		}
		if (t.type === "rightParenthesis") {
			if (stack.length > 1) {
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
			}
			// Top-level `)` is dropped (parse-error recovery) — we
			// *must not* pop the sentinel root, or the next token's
			// callback would push into an empty stack.
			if (rootIsComplete()) break;
			continue;
		}
		if (t.type === "rightSquareBracket") {
			if (stack.length > 1 && top().kind === "[") {
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, t.end, locConverter));
			}
			// Same root-preservation rationale as `rightParenthesis`.
			if (rootIsComplete()) break;
			continue;
		}
		pushTokenAsNode(t, input, locConverter, stack, onRootClose);
		if (rootIsComplete()) break;
	}

	// EOF before the root got a non-whitespace value — close any open
	// frames (spec §5.4.9 / §5.4.10 step 2.1) so the partial block/function
	// still surfaces.
	while (stack.length > 1) {
		const frame = /** @type {Frame} */ (stack.pop());
		top().values.push(_frameToNode(frame, endPos, locConverter));
	}

	for (const v of stack[0].values) {
		if (v.type === "whitespace") continue;
		return { value: v, end: endPos };
	}
	return undefined;
};

/**
 * Parse a declaration, per CSS Syntax Level 3 "consume a declaration"
 * (https://www.w3.org/TR/css-syntax-3/#consume-declaration). Returns
 * `undefined` if the input at `pos` is not a valid declaration head
 * (no ident-token, or no `:` after it) — the caller can then fall
 * through without consuming any tokens.
 *
 * Differences from the spec: the "consume the remnants of a bad
 * declaration" recovery is not run — webpack's parser runs `parseADeclaration`
 * as a sub-step from within an outer streaming walk and recovers via that
 * walk; consuming tokens here would skip past structure the outer walk needs
 * to see. Spec step 8 (custom-property original-text capture and
 * unicode-range special case) is not implemented — neither is needed for
 * our known-property handling.
 * @param {string} input source
 * @param {number} pos start position (typically the first character of the
 * property name; leading whitespace and comments are skipped)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment
 * optional comment-token callback forwarded to `walkCssTokens` while
 * consuming the value (so the outer parser's comment tracker still sees
 * magic comments inside the declaration value)
 * @returns {Declaration | undefined} parsed declaration or undefined
 */
const parseADeclaration = (input, pos, locConverter, comment) => {
	// Discard leading whitespace from the input (per `parse a declaration`).
	pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];

	const declStart = pos;

	// Step 1: ident-token → declaration name.
	const nameRange = walkCssTokens.eatIdentSequence(input, pos);
	if (!nameRange) return undefined;

	// Step 2: discard whitespace.
	pos = walkCssTokens.eatWhitespaceAndComments(input, nameRange[1])[0];

	// Step 3: expect colon-token, discard it.
	if (input.charCodeAt(pos) !== CC_COLON) return undefined;
	pos += 1;

	// Step 4: discard whitespace.
	pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];

	// Step 5: consume a list of component values up to the top-level
	// `;`, `}`, or `{`. The terminator itself is **not** consumed —
	// `parseAListOfComponentValues` rewinds to its start so the outer
	// parser still sees it.
	//
	// `{` terminates because, per CSS Syntax Level 3 §5.4.6 step 10
	// (the "consume a declaration" algorithm in its CSS-Nesting-aware
	// form), a declaration's value cannot contain a top-level
	// <{>-token: such input is a nested qualified rule, not a
	// declaration, and `consume a declaration` is supposed to fail so
	// the caller can backtrack into `consume a qualified rule`. We
	// implement the "fail" return below.
	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		{
			stopAtSemicolon: true,
			stopAtLeftCurly: true,
			stopAtRightCurly: true,
			comment
		}
	);

	// CSS Nesting disambiguation: if we stopped at a `{`, this isn't a
	// declaration — it's the body of a qualified rule (e.g.
	// `div:not(:local(.x)) { … }`). Returning `undefined` lets the
	// `parseABlocksContents` caller fall back to `parseAQualifiedRule`,
	// which is what every modern CSS parser does for nesting.
	//
	// Custom-property values (`--foo: { … };`) per the spec's
	// special-case would survive this check, but no caller in webpack
	// currently relies on that form. Adding that exception is left for
	// a follow-up commit if a test ever needs it.
	if (terminator === "{") return undefined;

	// Steps 6–7: detect trailing `!important` and trim trailing whitespace.
	let important = false;
	// First, drop any trailing whitespace from the value list.
	while (values.length > 0 && values[values.length - 1].type === T_WHITESPACE) {
		values.pop();
	}
	// Then look for the `!` + `important` pair at the tail. The spec says
	// "the last two non-whitespace tokens"; because we just stripped the
	// trailing whitespace, the `important` ident (if present) is at the
	// end and the `!` delim is the last non-whitespace token before it.
	if (values.length >= 2) {
		const last = values[values.length - 1];
		let prevIdx = values.length - 2;
		while (prevIdx >= 0 && values[prevIdx].type === T_WHITESPACE) prevIdx--;
		const prev = prevIdx >= 0 ? values[prevIdx] : undefined;
		if (
			prev &&
			last.type === T_IDENT &&
			/** @type {Token} */ (last).value.toLowerCase() === "important" &&
			prev.type === T_DELIM &&
			input.charCodeAt(prev.start) === CC_EXCLAMATION
		) {
			important = true;
			values.length = prevIdx;
			// Trim trailing whitespace once more after the `!important` cut.
			while (
				values.length > 0 &&
				values[values.length - 1].type === T_WHITESPACE
			) {
				values.pop();
			}
		}
	}

	return new Declaration(
		input.slice(nameRange[0], nameRange[1]),
		[nameRange[0], nameRange[1]],
		values,
		important,
		declStart,
		end,
		locConverter
	);
};

/**
 * Parse a single function token starting at `pos`, materializing it as a
 * `FunctionNode`. Per CSS Syntax Level 3 §5.4.10 *Consume a function*
 * (https://www.w3.org/TR/css-syntax-3/#consume-function): nested simple
 * blocks and functions are consumed recursively; an unmatched closing
 * paren is treated as an EOF for the function (the body ends, the parser
 * doesn't emit a parse error). Returns `undefined` if `pos` does not start
 * an `<ident-token>` immediately followed by `(`.
 *
 * Unlike the spec, which expects the function-token to have already been
 * consumed before calling "consume a function", this entry-point reads the
 * name itself so callers can hand it a raw source position from the
 * streaming tokenizer.
 *
 * The optional `comment` callback is forwarded to the underlying tokenizer
 * so the outer parser's comment tracker (used by `parseCommentOptions` to
 * find magic comments) still sees comments inside the function body even
 * though the body is consumed in one call.
 * @param {string} input source
 * @param {number} pos start position (the first character of the function name)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment
 * optional comment-token callback forwarded to `walkCssTokens`
 * @returns {FunctionNode | undefined} parsed function node, or undefined
 * when no function-token starts at `pos`
 */
const parseAFunction = (input, pos, locConverter, comment) => {
	const ident = walkCssTokens.eatIdentSequence(input, pos);
	if (!ident) return undefined;
	// CSS syntax: a function-token is an ident-sequence **immediately**
	// followed by `(` (no whitespace allowed).
	if (input.charCodeAt(ident[1]) !== CC_LEFT_PARENTHESIS) return undefined;

	return /** @type {FunctionNode | undefined} */ (
		_consumeIntoSeedFrame(input, ident[1] + 1, locConverter, comment, {
			values: [],
			kind: "function",
			name: input.slice(ident[0], ident[1]),
			nameRange: [ident[0], ident[1]],
			start: pos
		})
	);
};

/**
 * Parse a simple block starting at `pos`, per CSS Syntax Level 3
 * [§5.4.9](https://www.w3.org/TR/css-syntax-3/#consume-simple-block).
 * `pos` must point at `(`, `[`, or `{`; anything else returns
 * `undefined`. The opening token sets the block's `token` field; the
 * matching closing token (`)`, `]`, `}`) ends the consumption. Nested
 * simple blocks and functions are consumed recursively, so brackets
 * inside them stay inside their frames' `value` arrays.
 *
 * Unlike the spec, which expects the opening token to have already been
 * consumed before calling "consume a simple block", this entry-point
 * reads the opening character itself so callers can hand it a raw
 * source position from the streaming tokenizer.
 *
 * Per spec §5.4.9 step 2.1 (paraphrasing): an unmatched opening with no
 * matching closer hits EOF and the partial block is returned. parse-css
 * does the same without emitting a parse error; we follow that.
 * @param {string} input source
 * @param {number} pos start position (the `(`, `[`, or `{` byte)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {SimpleBlock | undefined} parsed simple block, or undefined when `pos` doesn't start a simple block
 */
const parseASimpleBlock = (input, pos, locConverter, comment) => {
	const ch = input.charCodeAt(pos);
	/** @type {SimpleBlockToken | undefined} */
	let kind;
	if (ch === CC_LEFT_PARENTHESIS) kind = "(";
	else if (ch === CC_LEFT_SQUARE_BRACKET) kind = "[";
	else if (ch === CC_LEFT_CURLY_BRACKET) kind = "{";
	else return undefined;

	return /** @type {SimpleBlock | undefined} */ (
		_consumeIntoSeedFrame(input, pos + 1, locConverter, comment, {
			values: [],
			kind,
			name: "",
			nameRange: null,
			start: pos
		})
	);
};

/**
 * Internal: drive `walkCssTokens` with a seed frame already pushed on the
 * stack, returning the materialized node when that seed frame closes (or
 * an EOF-implicitly-closed version). Shared by `parseAFunction` (seed
 * kind `"function"`, closed by `)`) and `parseASimpleBlock` (seed kind
 * `"(" | "[" | "{"`, closed by the matching `]` / `}` / `)`).
 * @param {string} input source
 * @param {number} startPos position to start tokenizing from (just past the seed frame's opening token)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number) | undefined} comment optional comment-token callback forwarded to the tokenizer
 * @param {Frame} seedFrame the frame already pushed on the stack — its kind determines what closes the root
 * @returns {FunctionNode | SimpleBlock | undefined} materialized node
 */
const _consumeIntoSeedFrame = (
	input,
	startPos,
	locConverter,
	comment,
	seedFrame
) => {
	/** @type {Frame[]} */
	const stack = [seedFrame];
	/** @type {FunctionNode | SimpleBlock | undefined} */
	let result;
	// `pushTokenAsNode`'s `onRootClose` fires when `)` / `]` pops the
	// seed frame to an empty stack — record the materialized node so
	// the loop can stop on the next iteration.
	/** @type {(frame: Frame, end: number) => void} */
	const onRootClose = (frame, end) => {
		result = /** @type {FunctionNode | SimpleBlock} */ (
			_frameToNode(frame, end, locConverter)
		);
	};

	let endPos = startPos;
	for (const t of walkCssTokens(input, startPos)) {
		endPos = t.end;
		if (t.type === "comment") {
			if (comment) comment(input, t.start, t.end);
			continue;
		}
		if (t.type === "rightCurlyBracket") {
			// `}` closes the top frame iff it's a `{`. If that pops the
			// seed (i.e. the seed was a `{` simple block), record and
			// terminate. Otherwise `}` is an unmatched stray and is
			// silently dropped — parse-css's recovery, consistent with
			// what `pushTokenAsNode` does for a stray `)`.
			if (stack.length > 0 && stack[stack.length - 1].kind === "{") {
				const frame = /** @type {Frame} */ (stack.pop());
				if (stack.length === 0) {
					result = /** @type {SimpleBlock} */ (
						_frameToNode(frame, t.end, locConverter)
					);
				} else {
					stack[stack.length - 1].values.push(
						_frameToNode(frame, t.end, locConverter)
					);
				}
			}
			if (result) break;
			continue;
		}
		if (t.type === "semicolon") {
			// `<semicolon-token>` inside a function body or simple block
			// is just a component value, per "consume a component value"
			// (§5.4.8) / "consume a function" (§5.4.10) / "consume a
			// simple block" (§5.4.9).
			stack[stack.length - 1].values.push(
				new Token(T_SEMICOLON, ";", t.start, t.end, locConverter)
			);
			continue;
		}
		pushTokenAsNode(t, input, locConverter, stack, onRootClose);
		if (result) break;
	}

	// EOF before the seed closed — implicitly close all open frames,
	// the outermost of which is the seed (spec §5.4.9 step 2.1 / §5.4.10
	// step 2.1: at EOF the partial block / function is returned).
	while (stack.length > 0) {
		const frame = /** @type {Frame} */ (stack.pop());
		const node = _frameToNode(frame, endPos, locConverter);
		if (stack.length === 0) {
			result = node;
		} else {
			stack[stack.length - 1].values.push(node);
		}
	}

	return result;
};
/**
 * Parse an at-rule, per CSS Syntax Level 3 §5.4.2 *Consume an at-rule*
 * (https://www.w3.org/TR/css-syntax-3/#consume-at-rule). Returns
 * `undefined` if `pos` does not start with `@<ident>`. The block (`{...}`)
 * is **not** consumed — `AtRule#terminator` tells the caller whether the
 * at-rule continues into a block (`"{"`) or has ended (`";"`/`"}"`/`null`),
 * so the outer streaming walker can take over and fire its own callbacks
 * for the terminator. This matches webpack's existing scope-tracking model
 * where `leftCurlyBracket`/`semicolon` callbacks drive the rule stack.
 *
 * Difference from the spec: `consume the remnants of a bad declaration`-style
 * recovery is not run, and `}` at the prelude's top level is treated as a
 * terminator rather than a delim consumed into the prelude. Both deviations
 * mirror the conservatism of `parseADeclaration` / `parseAFunction` —
 * webpack's streaming walker handles structural recovery one level up.
 * @param {string} input source
 * @param {number} pos start position (the `@` character)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {AtRule | undefined} parsed at-rule, or undefined when `pos` does not start with `@<ident>`
 */
const parseAtRule = (input, pos, locConverter, comment) => {
	if (input.charCodeAt(pos) !== CC_AT_SIGN) return undefined;
	// Per the CSS Syntax tokenizer, an at-keyword is `@` *immediately*
	// followed by an ident-sequence (no whitespace or comment between).
	// `eatIdentSequence` would silently skip leading whitespace, which would
	// match `@ foo` as `@foo` — wrong; verify the next byte starts the
	// sequence ourselves.
	if (
		!walkCssTokens.isIdentStartCodePoint(input.charCodeAt(pos + 1)) &&
		input.charCodeAt(pos + 1) !== "-".charCodeAt(0)
	) {
		return undefined;
	}
	const ident = walkCssTokens.eatIdentSequence(input, pos + 1);
	if (!ident || ident[0] !== pos + 1) return undefined;
	const nameEnd = ident[1];
	const name = input.slice(pos + 1, nameEnd);

	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		nameEnd,
		locConverter,
		{
			stopAtSemicolon: true,
			stopAtLeftCurly: true,
			stopAtRightCurly: true,
			comment
		}
	);

	return new AtRule(
		name,
		[pos, nameEnd],
		values,
		terminator,
		pos,
		end,
		locConverter
	);
};

/**
 * Parse a qualified rule starting at `pos`, per CSS Syntax Level 3
 * [§5.4.5](https://www.w3.org/TR/css-syntax-3/#consume-qualified-rule).
 * Consumes a list of component values (the prelude) until a `{` is hit,
 * then consumes the `{ ... }` simple-block as the rule's body. If EOF is
 * reached before `{`, the spec drops the rule as a parse error; we still
 * return a `QualifiedRule` with `block: null` so callers can decide
 * whether to recover (the streaming use-case wants the prelude span).
 *
 * Leading whitespace before the prelude is preserved — the prelude span
 * starts at `pos`. Callers that want a trimmed prelude should strip
 * whitespace tokens themselves.
 * @param {string} input source
 * @param {number} pos start position (first byte of the prelude — leading whitespace included)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {QualifiedRule} parsed qualified rule (with `block: null` on EOF)
 */
const parseAQualifiedRule = (input, pos, locConverter, comment) => {
	const start = pos;
	// Consume the prelude as a list of component values, stopping at `{`
	// (start of the block) or `}` (parse error / outer block close).
	const { values, end, terminator } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		{
			stopAtLeftCurly: true,
			stopAtRightCurly: true,
			comment
		}
	);

	if (terminator !== "{") {
		// EOF or stray `}` before the block opened — parse error.
		return new QualifiedRule(values, null, start, end, locConverter);
	}

	// Consume the `{ ... }` block — `end` points at the `{`.
	const block = /** @type {SimpleBlock} */ (
		parseASimpleBlock(input, end, locConverter, comment)
	);
	return new QualifiedRule(values, block, start, block.end, locConverter);
};

/**
 * Parse a block's contents starting at `pos`, per CSS Syntax Level 3
 * (CSS Nesting draft) [§5.4.4](https://www.w3.org/TR/css-syntax-3/#consume-block-contents).
 * Returns a mixed list of `Declaration`, `AtRule`, and `QualifiedRule`
 * nodes — i.e. everything you can find inside a style rule's `{ ... }`
 * with CSS Nesting enabled.
 *
 * `pos` should be the position immediately **after** the opening `{` of
 * the enclosing block (or `0` for the top-level stylesheet, which doesn't
 * have a `{`). Consumption stops at a top-level `}` — the matching close
 * of the enclosing block (`end` points **at** the `}`; not consumed) — or
 * at EOF (`end === input.length`).
 *
 * `terminator` reflects which of those stopped us so the caller can
 * advance past `}` if needed (`parseAStylesheet` doesn't expect a `}`).
 *
 * Spec algorithm differences: the spec runs "consume a declaration" then
 * falls back to "consume a qualified rule"; we do the same with
 * `parseADeclaration` and `parseAQualifiedRule`. When an at-rule's
 * prelude is `{`-terminated we additionally consume the block via
 * `parseASimpleBlock`, set `atRule.block`, and update `atRule.end` to
 * point past `}` — the spec leaves the block on the at-rule directly so
 * this matches that shape. Recovery: when both declaration and
 * qualified-rule consumption fail (rare — only at EOF in the middle of
 * nothing), we advance one byte and continue rather than spinning
 * forever.
 * @param {string} input source
 * @param {number} pos start position (just past the opening `{`, or 0 for top-level)
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {{ values: (Declaration | AtRule | QualifiedRule)[], end: number, terminator: "}" | null }} consumed nodes, final position (the closing `}` or EOF), and the kind of terminator
 */
const parseABlocksContents = (input, pos, locConverter, comment) => {
	/** @type {(Declaration | AtRule | QualifiedRule)[]} */
	const values = [];
	while (pos < input.length) {
		// Skip whitespace, comments, and stray semicolons between items.
		pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
		while (pos < input.length && input.charCodeAt(pos) === CC_SEMICOLON) {
			pos += 1;
			pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
		}
		if (pos >= input.length) break;
		// Top-level `}` — let the caller consume it.
		if (input.charCodeAt(pos) === CC_RIGHT_CURLY_BRACKET) {
			return { values, end: pos, terminator: "}" };
		}
		// At-rule.
		if (input.charCodeAt(pos) === CC_AT_SIGN) {
			const atRule = parseAtRule(input, pos, locConverter, comment);
			if (!atRule) {
				// Not a real at-keyword (e.g. `@` followed by non-ident);
				// advance one byte and continue to avoid an infinite loop.
				pos += 1;
				continue;
			}
			pos = atRule.end;
			if (atRule.terminator === "{") {
				// `@media (…) { … }` — consume the block too.
				const block = /** @type {SimpleBlock} */ (
					parseASimpleBlock(input, atRule.end, locConverter, comment)
				);
				atRule.block = block;
				atRule.end = block.end;
				pos = block.end;
			} else if (atRule.terminator === ";") {
				// Consume the `;` so the next iteration starts cleanly.
				pos += 1;
			}
			values.push(atRule);
			continue;
		}
		// Try a declaration first — `ident : value` with optional
		// `!important`. `parseADeclaration` returns undefined if the head
		// isn't a valid declaration; fall through to qualified-rule.
		const decl = parseADeclaration(input, pos, locConverter, comment);
		if (decl) {
			values.push(decl);
			pos = decl.end;
			if (input.charCodeAt(pos) === CC_SEMICOLON) pos += 1;
			continue;
		}
		// Qualified rule (CSS Nesting / top-level style rule).
		const rule = parseAQualifiedRule(input, pos, locConverter, comment);
		// Defensive: if the rule consumed zero bytes (rare, only if `pos`
		// is on a `}` that we somehow didn't catch above) advance one
		// byte to avoid spinning.
		if (rule.end <= pos) {
			pos += 1;
			continue;
		}
		values.push(rule);
		pos = rule.end;
	}
	return { values, end: pos, terminator: null };
};

/**
 * Parse a stylesheet, per CSS Syntax Level 3
 * [§5.3.1](https://www.w3.org/TR/css-syntax-3/#parse-stylesheet)
 * (which delegates to §5.4.3 "consume a list of rules" with the
 * top-level flag set). Returns the top-level list of qualified rules
 * and at-rules — no `Declaration`s, since declarations are not allowed
 * at the top level of a stylesheet (the spec treats a bare
 * `name: value;` at top level as a parse-error qualified rule with a
 * malformed prelude).
 *
 * Implementation note: this is a thin filter over `parseABlocksContents`
 * — both algorithms iterate items inside a "block-like" container; the
 * top level is the same loop with `}`-termination disabled (we never
 * hit one outside a real `{ ... }`) and declarations swallowed as
 * stray noise rather than kept. CDO (`<!--`) and CDC (`-->`) tokens
 * have no separate handling — they're rare in modern CSS and the
 * underlying tokenizer surfaces them as delim tokens that
 * `parseAQualifiedRule` will fold into a (malformed) prelude.
 * @param {string} input source
 * @param {LocConverter} locConverter shared loc converter
 * @param {((input: string, start: number, end: number) => number)=} comment optional comment-token callback forwarded to the underlying tokenizer
 * @returns {{ rules: (AtRule | QualifiedRule)[], end: number }} the
 * stylesheet's top-level rules and the position after the last rule
 * (typically `input.length`)
 */
const parseAStylesheet = (input, locConverter, comment) => {
	const result = parseABlocksContents(input, 0, locConverter, comment);
	/** @type {(AtRule | QualifiedRule)[]} */
	const rules = [];
	for (const v of result.values) {
		// Top-level declarations are spec parse errors — drop them. The
		// non-error items are at-rules and qualified rules.
		if (v.type === T_DECLARATION) continue;
		rules.push(/** @type {AtRule | QualifiedRule} */ (v));
	}
	return { rules, end: result.end };
};

// Identifier escape / unescape — operate on the raw text of an
// `<ident-token>` (or any source slice that may carry CSS escape sequences).
// `escapeIdentifier` produces a CSS-Syntax-3-conformant `<ident-token>` from
// an arbitrary string (so the result can be re-tokenized as the same name);
// `unescapeIdentifier` reverses tokenizer-time escapes per
// https://www.w3.org/TR/css-syntax-3/#consume-escaped-code-point.
// Both are pure string functions and have no dependency on the AST; they
// live here so the AST module is a one-stop shop for CSS-syntax-level
// utilities. `CssParser.js` re-exports them for back-compat with callers
// that previously reached them via `getCssParser()`.

const regexSingleEscape = /[ -,./:-@[\]^`{-~]/;
const regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6}) (?![a-fA-F0-9 ])/g;

/**
 * Returns escaped identifier.
 * @param {string} str string
 * @returns {string} escaped identifier
 */
const escapeIdentifier = (str) => {
	let output = "";
	let counter = 0;

	while (counter < str.length) {
		const character = str.charAt(counter++);

		/** @type {string} */
		let value;

		if (/[\t\n\f\r\v]/.test(character)) {
			const codePoint = character.charCodeAt(0);

			value = `\\${codePoint.toString(16).toUpperCase()} `;
		} else if (character === "\\" || regexSingleEscape.test(character)) {
			value = `\\${character}`;
		} else {
			value = character;
		}

		output += value;
	}

	const firstChar = str.charAt(0);

	if (/^-[-\d]/.test(output)) {
		output = `\\-${output.slice(1)}`;
	} else if (/\d/.test(firstChar)) {
		output = `\\3${firstChar} ${output.slice(1)}`;
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Note that this is only possible if the escape
	// sequence isn’t preceded by an odd number of backslashes.
	output = output.replace(regexExcessiveSpaces, ($0, $1, $2) => {
		if ($1 && $1.length % 2) {
			// It’s not safe to remove the space, so don’t.
			return $0;
		}

		// Strip the space.
		return ($1 || "") + $2;
	});

	return output;
};

const CONTAINS_ESCAPE = /\\/;

/**
 * Returns hex.
 * @param {string} str string
 * @returns {[string, number] | undefined} hex
 */
const gobbleHex = (str) => {
	const lower = str.toLowerCase();
	let hex = "";
	let spaceTerminated = false;

	for (let i = 0; i < 6 && lower[i] !== undefined; i++) {
		const code = lower.charCodeAt(i);
		// check to see if we are dealing with a valid hex char [a-f|0-9]
		const valid = (code >= 97 && code <= 102) || (code >= 48 && code <= 57);
		// https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
		spaceTerminated = code === 32;
		if (!valid) break;
		hex += lower[i];
	}

	if (hex.length === 0) return undefined;

	const codePoint = Number.parseInt(hex, 16);
	const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;

	// Add special case for
	// "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	// https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10ffff) {
		return ["�", hex.length + (spaceTerminated ? 1 : 0)];
	}

	return [
		String.fromCodePoint(codePoint),
		hex.length + (spaceTerminated ? 1 : 0)
	];
};

/**
 * Unescape identifier.
 * @param {string} str string
 * @returns {string} unescaped string
 */
const unescapeIdentifier = (str) => {
	const needToProcess = CONTAINS_ESCAPE.test(str);
	if (!needToProcess) return str;
	let ret = "";
	for (let i = 0; i < str.length; i++) {
		if (str[i] === "\\") {
			const gobbled = gobbleHex(str.slice(i + 1, i + 7));
			if (gobbled !== undefined) {
				ret += gobbled[0];
				i += gobbled[1];
				continue;
			}
			// Retain a pair of \\ if double escaped `\\\\`
			// https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
			if (str[i + 1] === "\\") {
				ret += "\\";
				i += 1;
				continue;
			}
			// if \\ is at the end of the string retain it
			// https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
			if (str.length === i + 1) {
				ret += str[i];
			}
			continue;
		}
		ret += str[i];
	}

	return ret;
};

module.exports.AtRule = AtRule;
module.exports.Declaration = Declaration;
module.exports.FunctionNode = FunctionNode;
module.exports.HashToken = HashToken;
module.exports.Node = Node;
module.exports.QualifiedRule = QualifiedRule;
module.exports.SimpleBlock = SimpleBlock;
module.exports.Token = Token;
module.exports.UrlToken = UrlToken;
module.exports.escapeIdentifier = escapeIdentifier;
module.exports.parseABlocksContents = parseABlocksContents;
module.exports.parseACommaSeparatedListOfComponentValues =
	parseACommaSeparatedListOfComponentValues;
module.exports.parseAComponentValue = parseAComponentValue;
module.exports.parseADeclaration = parseADeclaration;
module.exports.parseAFunction = parseAFunction;
module.exports.parseAListOfComponentValues = parseAListOfComponentValues;
module.exports.parseAQualifiedRule = parseAQualifiedRule;
module.exports.parseASimpleBlock = parseASimpleBlock;
module.exports.parseAStylesheet = parseAStylesheet;
module.exports.parseAtRule = parseAtRule;
module.exports.unescapeIdentifier = unescapeIdentifier;
