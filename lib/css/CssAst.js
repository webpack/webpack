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
const CC_EXCLAMATION = "!".charCodeAt(0);

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

/**
 * Consume a list of component values, building Function / SimpleBlock nodes
 * recursively. This wraps the low-level token stream from `walkCssTokens`
 * (which we use as our tokenizer) with a stack that materializes nested
 * brackets into AST nodes — equivalent to parse-css's
 * `consumeAListOfComponentValues` + `consumeASimpleBlock` + `consumeAFunction`.
 *
 * The walk stops when `needTerminate` is set inside a callback. The returned
 * position is whatever the underlying tokenizer last returned — callers
 * choose whether to consume the terminator by returning `e` or `s` from
 * their `;`/`}` callbacks.
 * @param {string} input source
 * @param {number} pos start position
 * @param {LocConverter} locConverter shared loc converter
 * @returns {{ values: Node[], end: number }} top-level values + final pos
 */
const consumeComponentValuesForDeclaration = (input, pos, locConverter) => {
	/** @typedef {{ values: Node[], kind: "root" | "function" | "[" | "(" | "{", name: string, nameRange: [number, number] | null, start: number }} Frame */

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

	const top = () => stack[stack.length - 1];
	/**
	 * @param {Node} node node to push onto the current top frame
	 */
	const push = (node) => {
		top().values.push(node);
	};

	/**
	 * Close the topmost open function/simple-block frame, materializing it
	 * into the appropriate AST node and appending it to its parent.
	 * @param {number} end end offset of the closing token (or implicit close)
	 */
	const closeTop = (end) => {
		if (stack.length <= 1) return;
		const frame = /** @type {Frame} */ (stack.pop());
		const parent = top();
		if (frame.kind === "function") {
			parent.values.push(
				new FunctionNode(
					frame.name,
					/** @type {[number, number]} */ (frame.nameRange),
					frame.values,
					frame.start,
					end,
					locConverter
				)
			);
		} else {
			parent.values.push(
				new SimpleBlock(
					/** @type {"[" | "(" | "{"} */ (frame.kind),
					frame.values,
					frame.start,
					end,
					locConverter
				)
			);
		}
	};

	const end = walkCssTokens(input, pos, {
		needTerminate: () => terminate,
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
			// Close a `function` or `(` frame; if there's a mismatch (e.g. a
			// stray `)` at top level), drop the token to match parse-css's
			// recovery.
			closeTop(e);
			return e;
		},
		rightSquareBracket: (_input, _s, e) => {
			if (top().kind === "[") closeTop(e);
			return e;
		},
		rightCurlyBracket: (_input, s, e) => {
			if (top().kind === "{") {
				closeTop(e);
				return e;
			}
			// Top-level `}` terminates the declaration value. We rewind to
			// the start of `}` so the outer parser still sees it.
			terminate = true;
			return s;
		},
		semicolon: (_input, s, e) => {
			if (stack.length === 1) {
				// Top-level `;` terminates the declaration value. We also
				// rewind so the outer parser can fire its own `semicolon`
				// callback for state updates (e.g. magic-comment tracking).
				terminate = true;
				return s;
			}
			push(new Token(T_SEMICOLON, ";", s, e, locConverter));
			return e;
		}
	});

	// Implicitly close any frames left open at EOF, per spec recovery.
	while (stack.length > 1) closeTop(end);

	return { values: stack[0].values, end };
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
 * @returns {Declaration | undefined} parsed declaration or undefined
 */
const parseADeclaration = (input, pos, locConverter) => {
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
	// semicolon or right-curly. The terminator itself is not consumed —
	// `consumeComponentValuesForDeclaration` rewinds to its start so the
	// outer parser still sees it.
	const { values, end } = consumeComponentValuesForDeclaration(
		input,
		pos,
		locConverter
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

module.exports.Declaration = Declaration;
module.exports.FunctionNode = FunctionNode;
module.exports.HashToken = HashToken;
module.exports.Node = Node;
module.exports.SimpleBlock = SimpleBlock;
module.exports.Token = Token;
module.exports.UrlToken = UrlToken;
module.exports.parseADeclaration = parseADeclaration;
