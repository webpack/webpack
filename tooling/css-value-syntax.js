/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Parse CSS Value Definition Syntax (CSS Values 4 §2) — the notation every
// `mdn-data` grammar is written in — into a tree `generate-css-data.js` can
// analyse. Generation time only: `lib/css/data.js` carries the answers, so the
// minifier never parses a grammar at runtime.

/** @typedef {{ type: "keyword", name: string }} KeywordNode */
/** @typedef {{ type: "literal", value: string }} LiteralNode */
/** @typedef {{ type: "type", name: string, min: number | null, max: number | null }} TypeNode */
/** @typedef {{ type: "property", name: string }} PropertyNode */
/** @typedef {{ type: "function", name: string, body: SyntaxNode | null }} FunctionCallNode */
/** @typedef {{ type: "group" | "parens", body: SyntaxNode }} GroupNode */
/** @typedef {{ type: "sequence" | "oneOf" | "anyOf" | "allOf", items: SyntaxNode[] }} CombinatorNode */
/** @typedef {{ type: "multiplier", min: number, max: number, comma: boolean, body: SyntaxNode }} MultiplierNode */
/** @typedef {KeywordNode | LiteralNode | TypeNode | PropertyNode | FunctionCallNode | GroupNode | CombinatorNode | MultiplierNode} SyntaxNode */

// A keyword or a function name. An at-rule prelude names its keyword with a
// leading `@`, so that joins the identifier set; `+` and `(` do not, since a
// name carrying either (`<an+b>`, `<calc-size()>`) only ever appears inside
// `< >`, which never reaches here — and both are notation out here.
const IDENTIFIER = /[\w\-%@]/;

// A repeat range is digits, and follows its atom with no space. Statement-level
// grammars use `{` for the block itself (`<keyframe-selector># { … }`), so the
// shape is what tells the two apart.
const REPEAT_RANGE = /^\d+(,\s*\d*)?$/;

// `mdn-data` carries a footnote dagger inside `<an+b>`. It marks spec prose, not
// syntax, and there is nothing in the notation it could mean.
const FOOTNOTE = /†/g;

/**
 * One value definition, parsed.
 */
class ValueSyntaxParser {
	/**
	 * @param {string} source the value definition
	 */
	constructor(source) {
		this.source = source.replace(FOOTNOTE, "");
		this.pos = 0;
		// `)` ends a sequence only inside parentheses; `general-enclosed` spells a
		// bare `)` as a literal outside any.
		this.parenDepth = 0;
	}

	/**
	 * @returns {SyntaxNode} the parsed definition
	 */
	parse() {
		const node = this._parseOneOf();
		this._skipWhitespace();
		if (this.pos !== this.source.length) {
			throw new Error(
				`unexpected "${this.source.slice(this.pos)}" at ${this.pos}`
			);
		}
		return node;
	}

	_skipWhitespace() {
		while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
			this.pos++;
		}
	}

	/**
	 * @param {string} text the text to match at the cursor
	 * @returns {boolean} true when it is there
	 */
	_at(text) {
		return this.source.startsWith(text, this.pos);
	}

	/**
	 * @param {string} text the expected text
	 */
	_expect(text) {
		this._skipWhitespace();
		if (!this._at(text)) {
			throw new Error(`expected "${text}" at ${this.pos}`);
		}
		this.pos += text.length;
	}

	/**
	 * `a | b` — exactly one. The loosest combinator, so the entry point.
	 * @returns {SyntaxNode} the alternation, or its one branch
	 */
	_parseOneOf() {
		const items = [this._parseAnyOf()];
		for (;;) {
			this._skipWhitespace();
			// `||` binds tighter and starts with the same character.
			if (!this._at("|") || this._at("||")) break;
			this.pos++;
			items.push(this._parseAnyOf());
		}
		return items.length === 1 ? items[0] : { type: "oneOf", items };
	}

	/**
	 * `a || b` — one or more, any order.
	 * @returns {SyntaxNode} the group, or its one branch
	 */
	_parseAnyOf() {
		const items = [this._parseAllOf()];
		for (;;) {
			this._skipWhitespace();
			if (!this._at("||")) break;
			this.pos += 2;
			items.push(this._parseAllOf());
		}
		return items.length === 1 ? items[0] : { type: "anyOf", items };
	}

	/**
	 * `a && b` — all of them, any order.
	 * @returns {SyntaxNode} the group, or its one branch
	 */
	_parseAllOf() {
		const items = [this._parseSequence()];
		for (;;) {
			this._skipWhitespace();
			if (!this._at("&&")) break;
			this.pos += 2;
			items.push(this._parseSequence());
		}
		return items.length === 1 ? items[0] : { type: "allOf", items };
	}

	/**
	 * `a b` — juxtaposition, the tightest combinator.
	 * @returns {SyntaxNode} the sequence, or its one term
	 */
	_parseSequence() {
		/** @type {SyntaxNode[]} */
		const items = [];
		for (;;) {
			this._skipWhitespace();
			if (this.pos === this.source.length) break;
			const c = this.source[this.pos];
			if (c === "]" || c === "|" || c === "&") break;
			if (c === ")" && this.parenDepth !== 0) break;
			items.push(this._parseTerm());
		}
		if (items.length === 0) {
			throw new Error(`empty sequence at ${this.pos}`);
		}
		return items.length === 1 ? items[0] : { type: "sequence", items };
	}

	/**
	 * One atom and whatever multiplier follows it.
	 * @returns {SyntaxNode} the term
	 */
	_parseTerm() {
		let node = this._parseAtom();
		// Multipliers stack: `<bg-layer>#?` is a comma list, itself optional.
		for (;;) {
			const wrapped = this._parseMultiplier(node);
			if (wrapped === null) return node;
			node = wrapped;
		}
	}

	/**
	 * @param {SyntaxNode} body the atom the multiplier applies to
	 * @returns {SyntaxNode | null} the wrapped atom, or `null` when none follows
	 */
	_parseMultiplier(body) {
		const c = this.source[this.pos];
		if (c === "?") {
			this.pos++;
			return { type: "multiplier", min: 0, max: 1, comma: false, body };
		}
		if (c === "*") {
			this.pos++;
			return { type: "multiplier", min: 0, max: Infinity, comma: false, body };
		}
		if (c === "+") {
			this.pos++;
			return { type: "multiplier", min: 1, max: Infinity, comma: false, body };
		}
		// `!` marks a group that must produce at least one value; for the analyses
		// here that is the group itself, so it is consumed and carries nothing.
		if (c === "!") {
			this.pos++;
			return { type: "multiplier", min: 1, max: 1, comma: false, body };
		}
		if (c === "#") {
			this.pos++;
			const range = this._parseRepeatRange();
			return {
				type: "multiplier",
				min: range === null ? 1 : range[0],
				max: range === null ? Infinity : range[1],
				comma: true,
				body
			};
		}
		if (c === "{") {
			const range = this._parseRepeatRange();
			if (range === null) return null;
			return {
				type: "multiplier",
				min: range[0],
				max: range[1],
				comma: false,
				body
			};
		}
		return null;
	}

	/**
	 * `{a}` or `{a,b}` or `{a,}`.
	 * @returns {[number, number] | null} the bounds, or `null` when none follows
	 */
	_parseRepeatRange() {
		if (this.source[this.pos] !== "{") return null;
		const end = this.source.indexOf("}", this.pos);
		if (end === -1) return null;
		const text = this.source.slice(this.pos + 1, end);
		if (!REPEAT_RANGE.test(text)) return null;
		this.pos = end + 1;
		const parts = text.split(",");
		const min = Number(parts[0]);
		if (parts.length === 1) return [min, min];
		const upper = parts[1].trim();
		return [min, upper === "" ? Infinity : Number(upper)];
	}

	/**
	 * @returns {SyntaxNode} the atom
	 */
	_parseAtom() {
		const c = this.source[this.pos];
		if (c === "[") {
			this.pos++;
			const body = this._parseOneOf();
			this._expect("]");
			return { type: "group", body };
		}
		// Literal parentheses the value itself must carry (`( <calc-sum> )`), not
		// the grouping `[ ]` does.
		if (c === "(") {
			this.pos++;
			this.parenDepth++;
			const body = this._parseOneOf();
			this._expect(")");
			this.parenDepth--;
			return { type: "parens", body };
		}
		if (c === "<") return this._parseTypeReference();
		if (c === "'" || c === '"') return this._parseQuoted();
		// `,` and `/` separate values; the rest punctuate a statement-level grammar
		// (an at-rule prelude, a block, a media feature) rather than a value.
		if (c === "," || c === "/" || c === ":" || c === ";" || c === ")") {
			this.pos++;
			return { type: "literal", value: c };
		}
		if (c === "{" || c === "}") {
			this.pos++;
			return { type: "literal", value: c };
		}
		return this._parseIdentifier();
	}

	/**
	 * `<length>`, `<length [0,∞]>`, `<'margin-top'>`.
	 * @returns {TypeNode | PropertyNode} the reference
	 */
	_parseTypeReference() {
		const end = this.source.indexOf(">", this.pos);
		if (end === -1) throw new Error(`unterminated "<" at ${this.pos}`);
		const inner = this.source.slice(this.pos + 1, end).trim();
		this.pos = end + 1;
		if (inner.startsWith("'") && inner.endsWith("'")) {
			return { type: "property", name: inner.slice(1, -1) };
		}
		const bracket = inner.indexOf("[");
		if (bracket === -1) {
			return { type: "type", name: inner, min: null, max: null };
		}
		const name = inner.slice(0, bracket).trim();
		const range = inner.slice(bracket + 1, inner.lastIndexOf("]")).split(",");
		return {
			type: "type",
			name,
			min: parseBound(range[0]),
			max: parseBound(range[1])
		};
	}

	/**
	 * @returns {LiteralNode} the quoted literal
	 */
	_parseQuoted() {
		const quote = this.source[this.pos];
		const end = this.source.indexOf(quote, this.pos + 1);
		if (end === -1) throw new Error(`unterminated ${quote} at ${this.pos}`);
		const value = this.source.slice(this.pos + 1, end);
		this.pos = end + 1;
		return { type: "literal", value };
	}

	/**
	 * A keyword, or a function when `(` follows the name.
	 * @returns {KeywordNode | FunctionCallNode} the atom
	 */
	_parseIdentifier() {
		const start = this.pos;
		while (
			this.pos < this.source.length &&
			IDENTIFIER.test(this.source[this.pos])
		) {
			this.pos++;
		}
		if (this.pos === start) {
			throw new Error(`unexpected "${this.source[this.pos]}" at ${this.pos}`);
		}
		const name = this.source.slice(start, this.pos);
		if (this.source[this.pos] !== "(") return { type: "keyword", name };
		this.pos++;
		this.parenDepth++;
		this._skipWhitespace();
		// `name()` — a function taking nothing.
		if (this._at(")")) {
			this.pos++;
			this.parenDepth--;
			return { type: "function", name, body: null };
		}
		const body = this._parseOneOf();
		this._expect(")");
		this.parenDepth--;
		return { type: "function", name, body };
	}
}

/**
 * A range bound: a number, possibly with a unit (`0s`), possibly infinite.
 * @param {string} text one side of a `[min,max]` annotation
 * @returns {number | null} the bound, or `null` when it is not a number
 */
const parseBound = (text) => {
	const value = text.trim();
	if (value === "∞") return Infinity;
	if (value === "-∞") return -Infinity;
	const match = /^-?\d*\.?\d+/.exec(value);
	return match === null ? null : Number(match[0]);
};

/**
 * @param {string} source a value definition
 * @returns {SyntaxNode} its tree
 */
const parseValueSyntax = (source) => new ValueSyntaxParser(source).parse();

/**
 * Every node in the tree, the root first.
 * @param {SyntaxNode} node the root
 * @param {(node: SyntaxNode) => void} visit called once per node
 */
const walkValueSyntax = (node, visit) => {
	visit(node);
	switch (node.type) {
		case "oneOf":
		case "anyOf":
		case "allOf":
		case "sequence":
			for (const item of node.items) walkValueSyntax(item, visit);
			break;
		case "group":
		case "parens":
		case "multiplier":
			walkValueSyntax(node.body, visit);
			break;
		case "function":
			if (node.body !== null) walkValueSyntax(node.body, visit);
			break;
		default:
			break;
	}
};

module.exports.parseValueSyntax = parseValueSyntax;
module.exports.walkValueSyntax = walkValueSyntax;
