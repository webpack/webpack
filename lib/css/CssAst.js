/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const walkCssTokens = require("./walkCssTokens");

/** @typedef {import("../util/LocConverter")} LocConverter */

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
const CC_LEFT_PARENTHESIS = "(".charCodeAt(0);
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
 * **not** consumed; `terminator` tells the caller what stopped the prelude
 * so the outer parser can fire the matching callback (`semicolon:` for
 * `;`-terminated at-rules, `leftCurlyBracket:` to enter a block at-rule).
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
 * Build the per-token callbacks that drive the AST construction. The set is
 * shared between every entry-point that consumes a list of component values
 * (parseADeclaration, parseAFunction, …); each entry-point supplies its own
 * `rightCurlyBracket` / `semicolon` overrides because the terminator
 * semantics differ per spec algorithm.
 * @param {string} input source
 * @param {LocConverter} locConverter shared loc converter
 * @param {Frame[]} stack frame stack — callbacks mutate the top frame's `values`
 * and push/pop frames as nested blocks open and close
 * @param {(frame: Frame, end: number) => void} onRootClose called when the
 * stack drops to empty after a `)`/`]`/`}` close — entry-points that consume
 * a single block (parseAFunction) use this to record the result and stop;
 * entry-points that have a sentinel root frame ignore it (their root never
 * closes via this path).
 * @returns {import("./walkCssTokens").CssTokenCallbacks} callbacks
 */
const _makeValueCallbacks = (input, locConverter, stack, onRootClose) => {
	const top = () => stack[stack.length - 1];
	/**
	 * @param {Node} node node to push onto the current top frame
	 */
	const push = (node) => {
		top().values.push(node);
	};
	/**
	 * Close the topmost frame, append the resulting AST node to its parent,
	 * or hand it to `onRootClose` if the stack just emptied.
	 * @param {number} end end offset of the closing token
	 */
	const closeTop = (end) => {
		if (stack.length === 0) return;
		const frame = /** @type {Frame} */ (stack.pop());
		const node = _frameToNode(frame, end, locConverter);
		if (stack.length === 0) {
			onRootClose(frame, end);
		} else {
			top().values.push(node);
		}
	};
	return {
		whitespace: (_input, s, e) => {
			push(new Token(T_WHITESPACE, input.slice(s, e), s, e, locConverter));
			return e;
		},
		identifier: (_input, s, e) => {
			push(new Token(T_IDENT, input.slice(s, e), s, e, locConverter));
			return e;
		},
		string: (_input, s, e) => {
			push(new Token(T_STRING, input.slice(s, e), s, e, locConverter));
			return e;
		},
		delim: (_input, s, e) => {
			push(new Token(T_DELIM, input.slice(s, e), s, e, locConverter));
			return e;
		},
		number: (_input, s, e) => {
			push(new Token(T_NUMBER, input.slice(s, e), s, e, locConverter));
			return e;
		},
		percentage: (_input, s, e) => {
			push(new Token(T_PERCENTAGE, input.slice(s, e), s, e, locConverter));
			return e;
		},
		dimension: (_input, s, e) => {
			push(new Token(T_DIMENSION, input.slice(s, e), s, e, locConverter));
			return e;
		},
		hash: (_input, s, e, isId) => {
			push(new HashToken(input.slice(s + 1, e), isId, s, e, locConverter));
			return e;
		},
		atKeyword: (_input, s, e) => {
			push(new Token(T_AT_KEYWORD, input.slice(s + 1, e), s, e, locConverter));
			return e;
		},
		url: (_input, s, e, cs, ce) => {
			push(new UrlToken(input.slice(cs, ce), cs, ce, s, e, locConverter));
			return e;
		},
		badStringToken: (_input, s, e) => {
			push(new Token(T_BAD_STRING, input.slice(s, e), s, e, locConverter));
			return e;
		},
		badUrlToken: (_input, s, e) => {
			push(new Token(T_BAD_URL, input.slice(s, e), s, e, locConverter));
			return e;
		},
		colon: (_input, s, e) => {
			push(new Token(T_COLON, ":", s, e, locConverter));
			return e;
		},
		comma: (_input, s, e) => {
			push(new Token(T_COMMA, ",", s, e, locConverter));
			return e;
		},
		function: (_input, s, e) => {
			// `e` points just past the `(`; the name occupies [s, e - 1).
			stack.push({
				values: [],
				kind: "function",
				name: input.slice(s, e - 1),
				nameRange: [s, e - 1],
				start: s
			});
			return e;
		},
		leftParenthesis: (_input, s, e) => {
			stack.push({
				values: [],
				kind: "(",
				name: "",
				nameRange: null,
				start: s
			});
			return e;
		},
		leftSquareBracket: (_input, s, e) => {
			stack.push({
				values: [],
				kind: "[",
				name: "",
				nameRange: null,
				start: s
			});
			return e;
		},
		leftCurlyBracket: (_input, s, e) => {
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: s
			});
			return e;
		},
		rightParenthesis: (_input, _s, e) => {
			// Close a `function` or `(` frame; a stray `)` with no matching
			// open is silently dropped to match parse-css's recovery.
			closeTop(e);
			return e;
		},
		rightSquareBracket: (_input, _s, e) => {
			if (stack.length > 0 && top().kind === "[") closeTop(e);
			return e;
		}
	};
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
	let terminate = false;
	/** @type {ListTerminator} */
	let terminator = null;
	const top = () => stack[stack.length - 1];

	const base = _makeValueCallbacks(input, locConverter, stack, () => {
		// Root frame is a sentinel — `onRootClose` only fires if we pop
		// past it, which would mean an unmatched `)`/`]` at the top level.
		// We've already accepted the parse-error recovery of dropping such
		// strays in `_makeValueCallbacks`, so there's nothing to do here.
	});

	const end = walkCssTokens(input, pos, {
		...base,
		comment,
		needTerminate: () => terminate,
		semicolon: (_input, s, e) => {
			if (stopAtSemicolon && stack.length === 1) {
				terminate = true;
				terminator = ";";
				return s;
			}
			top().values.push(new Token(T_SEMICOLON, ";", s, e, locConverter));
			return e;
		},
		leftCurlyBracket: (_input, s, e) => {
			if (stopAtLeftCurly && stack.length === 1) {
				terminate = true;
				terminator = "{";
				return s;
			}
			// Nested `{` simple block.
			stack.push({
				values: [],
				kind: "{",
				name: "",
				nameRange: null,
				start: s
			});
			return e;
		},
		rightCurlyBracket: (_input, s, e) => {
			if (stack.length > 1 && top().kind === "{") {
				// Close a nested `{` simple block.
				const frame = /** @type {Frame} */ (stack.pop());
				top().values.push(_frameToNode(frame, e, locConverter));
				return e;
			}
			if (stopAtRightCurly) {
				terminate = true;
				terminator = "}";
				return s;
			}
			// Spec §5.4.7: a top-level `}` with `nested=false` is a parse
			// error; the spec consumes it as a delim. We silently drop it
			// — the outer streaming walker handles structural recovery one
			// level up.
			return e;
		}
	});

	// EOF — implicitly close any frames left open, per spec §5.4.9 /
	// §5.4.10 step 2.1.
	while (stack.length > 1) {
		const frame = /** @type {Frame} */ (stack.pop());
		top().values.push(_frameToNode(frame, end, locConverter));
	}

	return { values: stack[0].values, end, terminator };
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
 * Spec deviation: the spec also requires the *trailing* input to be empty
 * after consuming the value (else syntax error). We don't enforce that —
 * callers ask for one component value because they want to know what's
 * there; whatever follows is their concern. This matches the practical
 * shape webpack uses in its streaming walker.
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @param {ParseListOptions=} options forwarded to the underlying list parser; `stopAt…` flags here let the caller specify what comes *after* the value (typically left unset)
 * @returns {{ value: Node, end: number } | undefined} the parsed component
 * value and the position immediately after it, or `undefined` if the
 * input is empty after whitespace
 */
const parseAComponentValue = (input, pos, locConverter, options = {}) => {
	pos = walkCssTokens.eatWhitespaceAndComments(input, pos)[0];
	if (pos >= input.length) return undefined;

	const { values, end } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		options
	);

	for (const v of values) {
		if (v.type === "whitespace") continue;
		return { value: v, end };
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
	// `;` or `}`. The terminator itself is **not** consumed —
	// `parseAListOfComponentValues` rewinds to its start so the outer
	// parser still sees it.
	const { values, end } = parseAListOfComponentValues(
		input,
		pos,
		locConverter,
		{
			stopAtSemicolon: true,
			stopAtRightCurly: true,
			comment
		}
	);

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

	/** @type {Frame[]} */
	const stack = [
		{
			values: [],
			kind: "function",
			name: input.slice(ident[0], ident[1]),
			nameRange: [ident[0], ident[1]],
			start: pos
		}
	];
	/** @type {FunctionNode | undefined} */
	let result;
	let terminate = false;

	const base = _makeValueCallbacks(input, locConverter, stack, (frame, end) => {
		// The root function frame closed — record the node and stop the walker.
		result = /** @type {FunctionNode} */ (
			_frameToNode(frame, end, locConverter)
		);
		terminate = true;
	});

	const end = walkCssTokens(input, ident[1] + 1, {
		...base,
		comment,
		needTerminate: () => terminate,
		rightCurlyBracket: (_input, _s, e) => {
			// `}` inside a function body closes a matching `{` simple block;
			// otherwise it's an unmatched stray and is dropped (parse-css
			// recovery — the spec's "consume a component value" treats `}` as
			// a delim outside of an open `{` block).
			if (stack.length > 0 && stack[stack.length - 1].kind === "{") {
				const frame = /** @type {Frame} */ (stack.pop());
				if (stack.length === 0) {
					// Can't actually happen — the root frame is "function",
					// not "{", so a `}` close never empties the stack here.
					return e;
				}
				stack[stack.length - 1].values.push(
					_frameToNode(frame, e, locConverter)
				);
			}
			return e;
		},
		semicolon: (_input, s, e) => {
			// `<semicolon-token>` inside a function body is just a component
			// value, per "consume a component value" / "consume a function".
			stack[stack.length - 1].values.push(
				new Token(T_SEMICOLON, ";", s, e, locConverter)
			);
			return e;
		}
	});

	// EOF before the function closed — implicitly close all open frames,
	// the outermost of which is the root function (spec §5.4.10 step 2.1).
	while (stack.length > 0) {
		const frame = /** @type {Frame} */ (stack.pop());
		const node = _frameToNode(frame, end, locConverter);
		if (stack.length === 0) {
			result = /** @type {FunctionNode} */ (node);
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

module.exports.AtRule = AtRule;
module.exports.Declaration = Declaration;
module.exports.FunctionNode = FunctionNode;
module.exports.HashToken = HashToken;
module.exports.Node = Node;
module.exports.SimpleBlock = SimpleBlock;
module.exports.Token = Token;
module.exports.UrlToken = UrlToken;
module.exports.parseACommaSeparatedListOfComponentValues =
	parseACommaSeparatedListOfComponentValues;
module.exports.parseAComponentValue = parseAComponentValue;
module.exports.parseADeclaration = parseADeclaration;
module.exports.parseAFunction = parseAFunction;
module.exports.parseAListOfComponentValues = parseAListOfComponentValues;
module.exports.parseAtRule = parseAtRule;
