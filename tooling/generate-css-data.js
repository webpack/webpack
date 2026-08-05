/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Generate `lib/css/data.js` — every table the CSS minifier looks a name up in
// that some published dataset already states — from `mdn-data` (the property and
// value-syntax database) and `color-name` (the named-color byte values).
//
//   node tooling/generate-css-data.js --write
//
// `yarn fix:special` writes it; `yarn lint:special` runs the same generator
// without `--write` and fails when the checked-in file no longer matches, so a
// data-package bump lands as a reviewable diff rather than as silent drift.
//
// Tables no dataset states are the `SUPPLEMENT` below — spec prose spelled out,
// each entry with the reason it is not derivable. They are emitted from here
// too, so every table the minifier looks a name up in lives in one file and
// `lib/css/syntax.js` stays algorithm.
//
// The parser for the notation those grammars are written in lives here as well,
// and is exported for its own tests. Requiring this file parses nothing: the
// generation runs only when it is the entry point.

const fs = require("fs");
const path = require("path");
const colorName = require("color-name");
/** @typedef {{ version: string }} PackageManifest */
/** @typedef {{ [name: string]: { syntax: string } }} SyntaxTable */
/** @type {PackageManifest} */
const colorNamePackage = require("color-name/package.json");
/** @type {{ [name: string]: { syntax?: string } }} */
const atRules = require("mdn-data/css/at-rules.json");
/** @type {SyntaxTable} */
const functions = require("mdn-data/css/functions.json");
/** @type {{ [name: string]: { syntax?: string, status?: string, computed?: string | string[] } }} */
const properties = require("mdn-data/css/properties.json");
const selectors = require("mdn-data/css/selectors.json");
/** @type {SyntaxTable} */
const syntaxes = require("mdn-data/css/syntaxes.json");
/** @type {PackageManifest} */
const mdnDataPackage = require("mdn-data/package.json");

// CSS Value Definition Syntax (CSS Values 4 §2) — the notation every `mdn-data`
// grammar is written in — parsed into a tree the collectors below analyze.
// Generation time only: `lib/css/data.js` carries the answers, so the minifier
// never parses a grammar at runtime.

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

const TARGET = path.resolve(__dirname, "../lib/css/data.js");
const write = process.argv.includes("--write");

// The `{1,4}` value-definition notation is CSS's box notation: an omitted value
// is copied from the opposite side (4 -> top right bottom left, 3 -> top
// right/left bottom, 2 -> top/bottom right/left, 1 -> all). Every property that
// spells its syntax that way inherits the rule, so matching the notation is
// enough — no per-property knowledge is needed.
//
// `{1,2}` is deliberately not matched. It looks like the same shape but the
// omitted value is not always a copy: `text-overflow: clip ellipsis` means
// start/end, and collapsing `ellipsis ellipsis` to `ellipsis` would silently
// move the first value back to its `clip` default.
const BOX_NOTATION = /\{1,4\}/;

// `fill` may sit anywhere among the four values, so a positional collapse would
// count it as one of them.
const POSITIONAL_KEYWORD = /\bfill\b/;

// A second box after a `/` (only `border-radius` today). Everywhere else a `/`
// makes the declaration invalid, so the minifier must leave it alone rather than
// collapse it into something the browser would start honoring.
const SLASH_NOTATION = /\//;

/**
 * @param {boolean} withSlash whether to collect the properties taking a second `/` box
 * @returns {string[]} the matching `{1,4}` box-shorthand property names, sorted
 */
const collectBoxShorthands = (withSlash) => {
	/** @type {string[]} */
	const names = [];
	for (const [name, property] of Object.entries(properties)) {
		if (typeof property.syntax !== "string") continue;
		if (property.status !== "standard") continue;
		if (!BOX_NOTATION.test(property.syntax)) continue;
		if (POSITIONAL_KEYWORD.test(property.syntax)) continue;
		if (SLASH_NOTATION.test(property.syntax) !== withSlash) continue;
		names.push(name);
	}
	return names.sort();
};

// The box side a longhand covers, read off its name.
const BOX_SIDES = ["top", "right", "bottom", "left"];

// The corner order `{1,4}` writes, which is not the order `computed` lists them
// in: `border-radius` names them clockwise from the top left, `corner-shape`
// names them by row. Matched on the longhand's own name so neither array's
// order is trusted.
const BOX_CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

/**
 * The shorthands that set exactly two longhands, positionally, separated by a
 * space: `<'a'>{1,2}` or `<'a'> <'b'>?`. Order-free (`||`) and `/`-separated
 * pairs are left out — their value order is not the `computed` order — as is
 * anything taking a comma list. Merging two such longhands sets exactly what
 * they did: a shorthand gathering a whole family resets more than `computed`
 * names (`border` clears `border-image`, `font` clears `font-size-adjust`),
 * which is why only the two-longhand ones are read this way.
 * @returns {[string, string[]][]} `[shorthand, [first, second]]`, sorted
 */
const collectPairLonghands = () => {
	/** @type {[string, string[]][]} */
	const out = [];
	for (const [name, property] of Object.entries(properties)) {
		if (property.status !== "standard") continue;
		if (typeof property.syntax !== "string") continue;
		const longhands = property.computed;
		if (!Array.isArray(longhands) || longhands.length !== 2) continue;
		let tree;
		try {
			tree = grammarOf(property.syntax);
		} catch (_err) {
			continue;
		}
		// `<'a'>{1,2}` — one production written once or twice.
		const repeated =
			tree.type === "multiplier" &&
			tree.min === 1 &&
			tree.max === 2 &&
			!tree.comma;
		// `<'a'> <'b'>?` — the second optional, in the order `computed` lists.
		const sequence =
			tree.type === "sequence" &&
			tree.items.length === 2 &&
			tree.items[1].type === "multiplier" &&
			tree.items[1].min === 0 &&
			tree.items[1].max === 1;
		if (!repeated && !sequence) continue;
		// `<'a'> [ / <'b'> ]?` reads as a sequence too, and a `/` is not a space.
		let slashed = false;
		walkValueSyntax(tree, (node) => {
			if (node.type === "literal" && node.value === "/") slashed = true;
		});
		if (slashed) continue;
		const override = SUPPLEMENT.pairLonghandOverrides.find(
			([property]) => property === name
		);
		out.push([name, override === undefined ? longhands : override[1]]);
	}
	// Two shorthands claiming the same two longhands cannot both be right, so
	// neither is trusted — a backstop for the next `mdn-data` collision, the one
	// today being corrected above.
	/** @type {Map<string, number>} */
	const claims = new Map();
	for (const [, longhands] of out) {
		const key = longhands.join(" ");
		claims.set(key, (claims.get(key) || 0) + 1);
	}
	const newer = new Set(SUPPLEMENT.newerPairShorthands);
	return out
		.filter(
			([name, longhands]) =>
				claims.get(longhands.join(" ")) === 1 && !newer.has(name)
		)
		.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The pair shorthands only a merge collapsing to one value may emit, because
 * their two-value form is newer than the longhands.
 * @param {[string, string[]][]} pairs the collected pair shorthands
 * @returns {string[]} the property names, sorted
 */
const collectOneValuePairShorthands = (pairs) => {
	const named = new Set(SUPPLEMENT.oneValuePairShorthands);
	return pairs.map(([name]) => name).filter((name) => named.has(name));
};

// The value types a grammar walk stops at rather than expands: what a minifier
// can tell one authored component from another by. Anything else is expanded,
// so `<line-width>` yields `length` plus its three keywords.
const VALUE_CLASSES = new Set([
	"angle",
	"color",
	"custom-ident",
	"dashed-ident",
	"frequency",
	"ident",
	"image",
	"integer",
	"length",
	"number",
	"percentage",
	"resolution",
	"string",
	"time",
	"url"
]);

/**
 * What a property accepts as a whole value: the keywords it names, and the
 * value classes it reaches. Expands `<'property'>` and `<syntax>` references
 * but stops at a class, and skips a function's arguments — `hsl(… none …)`
 * makes `none` no keyword of `<color>`.
 * @param {string} syntax the value-definition syntax
 * @returns {{ keywords: Set<string>, classes: Set<string> }} what it accepts
 */
const acceptedValues = (syntax) => {
	const keywords = new Set();
	const classes = new Set();
	const seen = new Set();
	/**
	 * @param {string} source a value-definition syntax to expand
	 * @returns {void}
	 */
	const expand = (source) => {
		if (seen.has(source)) return;
		seen.add(source);
		let tree;
		try {
			tree = parseValueSyntax(source);
		} catch (_err) {
			return;
		}
		/**
		 * @param {EXPECTED_ANY} node the node to walk
		 * @param {boolean} inFunction whether it sits in a function's arguments
		 * @returns {void}
		 */
		const walk = (node, inFunction) => {
			if (node.type === "keyword") {
				if (!inFunction) keywords.add(node.name);
				return;
			}
			if (node.type === "type") {
				if (inFunction) return;
				if (VALUE_CLASSES.has(node.name)) classes.add(node.name);
				else if (syntaxes[node.name]) expand(syntaxes[node.name].syntax);
				// A type no dataset spells out matches nothing at print time, so
				// naming it keeps the slot from claiming a value it would accept.
				else classes.add(node.name);
				return;
			}
			if (node.type === "property") {
				if (!inFunction && properties[node.name]) {
					expand(/** @type {string} */ (properties[node.name].syntax));
				}
				return;
			}
			if (node.type === "function") {
				if (node.body !== null) walk(node.body, true);
				return;
			}
			if (node.items) for (const item of node.items) walk(item, inFunction);
			else if (node.body) walk(node.body, inFunction);
		};
		walk(tree, false);
	};
	expand(syntax);
	return { keywords, classes };
};

/**
 * CSS keywords are case-insensitive, so a table read back by a lowercased
 * lookup holds them lowercased — `currentColor` and `CanvasText` included.
 * @param {Set<string>} keywords the keywords as the grammar spells them
 * @returns {string[]} the lowercased names, deduplicated and sorted
 */
const lowerSorted = (keywords) =>
	[...new Set([...keywords].map((keyword) => keyword.toLowerCase()))].sort();

/**
 * The shorthands written as an order-free `||` of their own longhands, each
 * appearing once: `outline`, `text-decoration`, … Merging those emits every
 * value in grammar order, which `||` accepts in any order, so the only question
 * is whether each value parses back into the longhand it was authored on — the
 * per-slot tables below are what answers it.
 * @returns {[string, string[]][]} `[shorthand, longhands]` in grammar order
 */
const collectFamilyLonghands = () => {
	const verified = new Set(SUPPLEMENT.familyShorthands);
	/** @type {[string, string[]][]} */
	const out = [];
	for (const [name, property] of Object.entries(properties)) {
		if (!verified.has(name)) continue;
		if (typeof property.syntax !== "string") continue;
		const longhands = property.computed;
		if (!Array.isArray(longhands) || longhands.length < 2) continue;
		let tree;
		try {
			tree = parseValueSyntax(property.syntax);
		} catch (_err) {
			continue;
		}
		if (tree.type !== "anyOf") continue;
		const slots = tree.items.map((item) =>
			item.type === "property" ? item.name : null
		);
		if (slots.includes(null)) continue;
		if (slots.length !== longhands.length) continue;
		if (
			slots.some((slot) => !longhands.includes(/** @type {string} */ (slot)))
		) {
			continue;
		}
		out.push([name, /** @type {string[]} */ (slots)]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The `{1,4}` box shorthands whose four longhands map onto the four sides, in
 * `top right bottom left` order. Merging four such longhands into the shorthand
 * sets exactly the same properties — nothing extra is reset.
 * @param {string[]} shorthands the box-shorthand property names
 * @returns {[string, string[]][]} `[shorthand, longhands]`, sorted
 */
const collectBoxLonghands = (shorthands) => {
	/** @type {[string, string[]][]} */
	const out = [];
	for (const name of shorthands) {
		const longhands = properties[name].computed;
		if (!Array.isArray(longhands) || longhands.length !== 4) continue;
		const match = (/** @type {string} */ part) =>
			longhands.find(
				(longhand) =>
					longhand === part ||
					longhand.includes(`-${part}-`) ||
					longhand.endsWith(`-${part}`)
			);
		// A corner name holds two side names (`border-top-left-radius` answers both
		// `top` and `left`), so a sides match only counts when it is one-to-one.
		const distinct = (/** @type {(string | undefined)[]} */ found) =>
			!found.includes(undefined) && new Set(found).size === found.length;
		let sides = BOX_SIDES.map(match);
		if (!distinct(sides)) sides = BOX_CORNERS.map(match);
		if (!distinct(sides)) continue;
		if (new Set(sides).size !== 4) continue;
		out.push([name, /** @type {string[]} */ (sides)]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

// Every value-definition production, function ones included. `functions.json`
// and `syntaxes.json` overlap; `syntaxes.json` wins, as the more complete of the
// two for the productions they share.
/** @type {Map<string, string>} */
const definitions = new Map();
for (const [name, entry] of Object.entries(functions)) {
	definitions.set(name, entry.syntax);
}
for (const [name, entry] of Object.entries(syntaxes)) {
	definitions.set(name, entry.syntax);
}

/**
 * @param {string} syntax a value definition
 * @returns {string[]} the production names it references
 */
const references = (syntax) => {
	const found = syntax.match(/<[^>\s]+>/g);
	return found === null ? [] : found.map((name) => name.slice(1, -1));
};

/** @type {Map<string, SyntaxNode>} */
const grammars = new Map();

/**
 * @param {string} syntax a value definition
 * @returns {SyntaxNode} its tree, parsed once
 */
const grammarOf = (syntax) => {
	let tree = grammars.get(syntax);
	if (tree === undefined) {
		tree = parseValueSyntax(syntax);
		grammars.set(syntax, tree);
	}
	return tree;
};

// Parse every grammar the datasets state, so a `mdn-data` bump that reaches for
// notation this parser does not know fails here rather than silently emptying a
// table below. `selectors.json` is deliberately not among them: it mixes real
// grammar with prose examples (`".class"`, `"A > B"`), so it is not all parsable
// and nothing here reads it yet.
const assertGrammarsParse = () => {
	/**
	 * @param {string} label what the grammar belongs to
	 * @param {string} syntax the definition
	 */
	const check = (label, syntax) => {
		try {
			grammarOf(syntax);
		} catch (err) {
			throw new Error(
				`${label} does not parse: ${/** @type {Error} */ (err).message}\n  ${syntax}`,
				{ cause: err }
			);
		}
	};
	for (const [name, syntax] of definitions) check(`<${name}>`, syntax);
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax === "string") check(name, entry.syntax);
	}
	for (const [name, entry] of Object.entries(atRules)) {
		if (typeof entry.syntax === "string") check(`@${name}`, entry.syntax);
	}
};

/**
 * Each convertible group's reference unit: the shortest-scaled one a conversion
 * may emit, so a value counted in the group's base comes back through a unit
 * that exists. Derived from the scale table rather than named here, so a unit
 * joining the group cannot leave this stale.
 * @returns {[string, [string, number]][]} `[group, [unit, scale]]`, sorted
 */
const collectUnitGroupBase = () => {
	/** @type {Map<string, [string, number]>} */
	const base = new Map();
	for (const [unit, group, scale] of SUPPLEMENT.absoluteUnitScale) {
		if (!SUPPLEMENT.unitConversionTargets.includes(unit)) continue;
		const previous = base.get(group);
		if (previous === undefined || scale < previous[1]) {
			base.set(group, [unit, scale]);
		}
	}
	return [...base].sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The keywords a production is, when it is nothing but a choice between them —
 * `<rounding-strategy>` is `nearest | up | down | to-zero`. Anything with a
 * type reference or a structure in it is not a keyword set and returns `null`.
 * @param {string} name the production name
 * @returns {string[] | null} the keywords, sorted, or `null`
 */
const keywordChoices = (name) => {
	const syntax = definitions.get(name);
	if (syntax === undefined) return null;
	const tree = grammarOf(syntax);
	const items = tree.type === "oneOf" ? tree.items : [tree];
	/** @type {string[]} */
	const out = [];
	for (const item of items) {
		if (item.type !== "keyword") return null;
		out.push(item.name);
	}
	return out.sort();
};

/**
 * How many `<calc-sum>` arguments each math function takes, read off its own
 * grammar: `min( <calc-sum># )` is one or more, `clamp( <calc-sum>#{3} )` is
 * exactly three, `log( <calc-sum>, <calc-sum>? )` is one or two. An optional
 * leading keyword is read too — `round( <rounding-strategy>?, …)` — and comes
 * back beside the count. A function taking anything else is absent:
 * `calc-size()` leads with a basis, which is an expression this cannot evaluate,
 * so the minifier reads the absence as "not foldable" rather than carrying its
 * own list of which functions those are.
 * @param {string[]} names the math function names
 * @returns {[string, [number, number], string[]][]} `[name, [min, max], keywords]`, sorted
 */
const collectMathFunctionArity = (names) => {
	/** @type {string[]} */
	let keywords = [];
	/**
	 * @param {SyntaxNode} node a grammar node
	 * @returns {[number, number] | null} the `<calc-sum>` count it contributes
	 */
	const count = (node) => {
		switch (node.type) {
			case "type":
				return node.name === "calc-sum" ? [1, 1] : null;
			case "literal":
				// The separators between arguments carry no argument of their own.
				return node.value === "," ? [0, 0] : null;
			case "group":
			case "parens":
				return count(node.body);
			case "multiplier": {
				// An optional keyword argument: not an expression, so it carries no
				// `<calc-sum>` of its own, but the function still accepts it.
				if (
					node.min === 0 &&
					node.max === 1 &&
					node.body.type === "type" &&
					node.body.name !== "calc-sum"
				) {
					const choices = keywordChoices(node.body.name);
					if (choices === null) return null;
					keywords = choices;
					return [0, 0];
				}
				const inner = count(node.body);
				if (inner === null) return null;
				const min = inner[0] * node.min;
				const max = inner[1] * node.max;
				return Number.isNaN(min) || Number.isNaN(max) ? null : [min, max];
			}
			case "sequence": {
				let min = 0;
				let max = 0;
				for (const item of node.items) {
					const inner = count(item);
					if (inner === null) return null;
					min += inner[0];
					max += inner[1];
				}
				return [min, max];
			}
			default:
				return null;
		}
	};
	/** @type {[string, [number, number], string[]][]} */
	const out = [];
	for (const name of names) {
		const syntax = definitions.get(`${name}()`);
		if (syntax === undefined) continue;
		const tree = grammarOf(syntax);
		if (tree.type !== "function" || tree.body === null) continue;
		keywords = [];
		const arity = count(tree.body);
		if (arity !== null) out.push([name, arity, keywords]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * Where a math function the whole-call fold cannot read still takes a
 * `<calc-sum>`, so that argument can be reduced in place. `calc-size()` is the
 * one today: its basis is not an expression, which is exactly why counting
 * `<calc-sum>`s refuses the function, and the size it is given still reduces.
 * @param {string[]} names the math function names
 * @param {[string, [number, number], string[]][]} arity the functions the fold already reads
 * @returns {[string, number[]][]} each name with its `<calc-sum>` argument positions
 */
const collectMathFunctionSumArguments = (names, arity) => {
	const readable = new Set(arity.map(([name]) => name));
	/** @type {[string, number[]][]} */
	const out = [];
	for (const name of names) {
		const syntax = definitions.get(`${name}()`);
		if (syntax === undefined || readable.has(name)) continue;
		const tree = grammarOf(syntax);
		if (tree.type !== "function" || tree.body === null) continue;
		const items = tree.body.type === "sequence" ? tree.body.items : [tree.body];
		/** @type {number[]} */
		const positions = [];
		let position = 0;
		let readable_ = true;
		for (const item of items) {
			if (item.type === "literal" && item.value === ",") {
				position++;
			} else if (item.type === "type" && item.name === "calc-sum") {
				positions.push(position);
			} else if (item.type !== "type") {
				// Anything but a plain argument makes the positions unreliable.
				readable_ = false;
			}
		}
		if (readable_ && positions.length) out.push([name, positions]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

// The types a number lands on. Everything else a grammar reaches (`<color>`,
// `<image>`, an identifier) carries no magnitude of its own.
const NUMERIC_TYPES = new Set([
	"angle",
	"flex",
	"frequency",
	"integer",
	"length",
	"number",
	"percentage",
	"resolution",
	"time"
]);

/**
 * Every numeric leaf a grammar can reach, each with the lower bound its
 * annotation states — `null` where it states none, which is most of them:
 * `mdn-data` annotates `padding-top` but not `opacity`, whose `<opacity-value>`
 * expands to a bare `<number> | <percentage>`.
 * @param {string} syntax a value definition
 * @returns {[string, number | null][]} the leaves as `[type, minimum]`
 */
const numericLeaves = (syntax) => {
	/** @type {[string, number | null][]} */
	const found = [];
	/** @type {Set<string>} */
	const seen = new Set();
	/**
	 * @param {string} definition the definition to walk
	 */
	const walk = (definition) => {
		walkValueSyntax(grammarOf(definition), (node) => {
			// A shorthand names no leaf of its own: `columns` reaches `<integer>`
			// only through `<'column-count'>`. Keyed apart from the type names,
			// which `<'color'>` and `<color>` would otherwise share.
			if (node.type === "property") {
				const nested = properties[node.name];
				if (
					nested !== undefined &&
					typeof nested.syntax === "string" &&
					!seen.has(`'${node.name}`)
				) {
					seen.add(`'${node.name}`);
					walk(nested.syntax);
				}
				return;
			}
			if (node.type !== "type") return;
			if (NUMERIC_TYPES.has(node.name)) {
				found.push([node.name, node.min]);
				return;
			}
			// One name for two leaves, and the annotation binds to both.
			if (node.name === "length-percentage") {
				found.push(["length", node.min], ["percentage", node.min]);
				return;
			}
			const nested = definitions.get(node.name);
			if (nested !== undefined && !seen.has(node.name)) {
				seen.add(node.name);
				walk(nested);
			}
		});
	};
	walk(syntax);
	return found;
};

/**
 * The properties whose grammar can reach an `<integer>`. Over-approximate on
 * purpose: it is read to refuse a rewrite (a non-integer where an integer is
 * expected is rounded, not dropped — `z-index: calc(1.5)` computes to `2`), so
 * naming one property too many costs a rewrite and naming one too few is a bug.
 * @returns {string[]} the property names, sorted
 */
const collectIntegerProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		if (numericLeaves(entry.syntax).some(([type]) => type === "integer")) {
			out.push(name);
		}
	}
	return out.sort();
};

/**
 * Every production one grammar can reach, following both `<production>` and
 * `<'property'>` references to a fixed point.
 * @param {string} syntax a value definition
 * @returns {Set<string>} the reachable production names (a property as `'name'`)
 */
const reachableProductions = (syntax) => {
	const seen = new Set();
	const queue = [syntax];
	while (queue.length !== 0) {
		const current = /** @type {string} */ (queue.pop());
		for (const raw of references(current)) {
			const isProperty = raw.startsWith("'") && raw.endsWith("'");
			const name = isProperty ? raw.slice(1, -1) : raw;
			if (seen.has(raw)) continue;
			seen.add(raw);
			const entry = properties[name];
			const next = isProperty
				? entry !== undefined && typeof entry.syntax === "string"
					? entry.syntax
					: undefined
				: definitions.get(name);
			if (next !== undefined) queue.push(next);
		}
	}
	return seen;
};

// A grammar reaching one of these takes a color.
const COLOR_PRODUCTIONS = new Set([
	"color",
	"named-color",
	"absolute-color-base",
	"absolute-color-function",
	"system-color"
]);

// …and one reaching either of these takes a bare identifier that is not a color,
// so a named color there may be the author's own name (`animation-name: red`).
// `<dashed-ident>` is not one: it starts with `--`, which no color name does.
const NAME_PRODUCTIONS = new Set(["custom-ident", "ident"]);

// What `display`'s two-keyword form leaves out, which no dataset states — CSS
// Display 3 §2: an omitted `<display-inside>` is `flow`, an omitted
// `<display-outside>` is `block` save for `ruby`, whose own default is `inline`.
const DISPLAY_DEFAULT_INSIDE = "flow";
const DISPLAY_DEFAULT_OUTSIDE = "block";
const DISPLAY_INLINE_DEFAULTED_INSIDES = new Set(["ruby"]);
// …and the one legacy keyword its own name does not spell: §2.5 states
// `inline-block` is the short form of `inline flow-root`.
const DISPLAY_UNNAMED_LEGACY = new Map([["inline flow-root", "inline-block"]]);

/**
 * Each two-keyword `display` -> the single keyword naming the same box, worked
 * out from the keyword lists the grammar states and the defaults above rather
 * than listed: a `flow` inside is the default, a `block` outside is the default,
 * and an `inline` one has a legacy keyword where `display-legacy` spells it.
 * @returns {[string, string][]} the entries, sorted by the two-keyword form
 */
const collectDisplayShortForms = () => {
	const keywords = (name) =>
		definitions
			.get(name)
			.split("|")
			.map((one) => one.trim())
			.filter((one) => /^[a-z][a-z-]*$/.test(one));
	const outsides = keywords("display-outside");
	const insides = keywords("display-inside");
	const legacy = new Set(keywords("display-legacy"));
	/** @type {[string, string][]} */
	const out = [];
	for (const outside of outsides) {
		for (const inside of insides) {
			const pair = `${outside} ${inside}`;
			const defaultOutside = DISPLAY_INLINE_DEFAULTED_INSIDES.has(inside)
				? "inline"
				: DISPLAY_DEFAULT_OUTSIDE;
			let short = null;
			if (inside === DISPLAY_DEFAULT_INSIDE) {
				short = outside;
			} else if (outside === defaultOutside) {
				short = inside;
			} else if (legacy.has(`${outside}-${inside}`)) {
				short = `${outside}-${inside}`;
			} else {
				short = DISPLAY_UNNAMED_LEGACY.get(pair) || null;
			}
			if (short !== null && short.length < pair.length) out.push([pair, short]);
		}
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The generic font families, expanded out of the production naming them. An
 * unquoted one of these is the generic rather than a family with that name, so
 * a quoted family spelled like one keeps its quotes.
 * @returns {string[]} the keywords, sorted
 */
const collectGenericFontFamilies = () => {
	const names = new Set();
	const walk = (syntax, seen) => {
		for (const part of syntax.split("|")) {
			const term = part.trim();
			const reference = /^<([a-z-]+)>$/.exec(term);
			if (reference === null) {
				if (/^[a-z][a-z-]*$/.test(term)) names.add(term);
				continue;
			}
			const next = definitions.get(reference[1]);
			if (next !== undefined && !seen.has(reference[1])) {
				walk(next, new Set(seen).add(reference[1]));
			}
		}
	};
	walk(definitions.get("generic-family"), new Set(["generic-family"]));
	return [...names].sort();
};

/**
 * The properties whose value is a `<repeat-style>`, where the one-value form
 * repeats itself on both axes — so two equal keywords are what one already says.
 * @returns {string[]} the property names, sorted
 */
const collectRepeatStyleProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		if (reachableProductions(entry.syntax).has("repeat-style")) out.push(name);
	}
	return out.sort();
};

/**
 * The properties whose value is a `<bg-position>`, where `center` is the `50%`
 * the axis defaults to anyway.
 * @returns {string[]} the property names, sorted
 */
const collectBackgroundPositionProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		const reachable = reachableProductions(entry.syntax);
		// The longhand only: a shorthand's `center` sits among other components,
		// where the three- and four-value forms read a keyword rather than a length.
		if (reachable.has("bg-position") && !reachable.has("bg-layer")) {
			out.push(name);
		}
	}
	return out.sort();
};

/**
 * Each property whose initial value is a keyword shorter than `initial` itself
 * -> that keyword. `initial` computes to the initial value whatever the
 * property, so the two are the same declaration and the shorter one is written.
 * A shorthand states its initial as the list of its longhands rather than a
 * value, which is what keeps one out of this table.
 * @returns {[string, string][]} the entries, sorted by property
 */
const collectInitialValueKeywords = () => {
	/** @type {[string, string][]} */
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		const initial = entry.initial;
		if (typeof initial !== "string") continue;
		if (!/^[a-z][a-z-]*$/.test(initial)) continue;
		if (initial.length >= "initial".length) continue;
		out.push([name, initial]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The properties whose grammar takes a color and never a bare identifier of the
 * author's own, so a named color written in one is unambiguously that color and
 * may be rewritten to whichever spelling is shortest. Under-approximate on
 * purpose: naming one property too few only costs bytes, while naming one too
 * many would rewrite an identifier that means something else.
 * @returns {string[]} the property names, sorted
 */
const collectColorOnlyProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		const reachable = reachableProductions(entry.syntax);
		let color = false;
		let named = false;
		for (const production of reachable) {
			if (COLOR_PRODUCTIONS.has(production)) color = true;
			if (NAME_PRODUCTIONS.has(production)) named = true;
		}
		if (color && !named) out.push(name);
	}
	return out.sort();
};

// CSS Modules keyword tables. A `css/module` localizes the custom identifiers in
// a handful of property values (`animation-name: spin` names a scoped
// `@keyframes`), so the parser needs to know which idents in those values are
// the grammar's own keywords instead. That set is the literal keywords of each
// property's grammar, and how many times one may be spelled before the next is
// the name — both read off the grammar here rather than listed.

/** @typedef {{ type: "ident" }} IdentNode */
/** @typedef {{ type: "opaque" }} OpaqueNode */
/** @typedef {{ type: "sequence" | "oneOf" | "anyOf" | "allOf", items: ExpandedNode[] }} ExpandedCombinatorNode */
/** @typedef {{ type: "group" | "parens", body: ExpandedNode }} ExpandedGroupNode */
/** @typedef {{ type: "multiplier", min: number, max: number, comma: boolean, body: ExpandedNode }} ExpandedMultiplierNode */
/** @typedef {KeywordNode | LiteralNode | IdentNode | OpaqueNode | ExpandedCombinatorNode | ExpandedGroupNode | ExpandedMultiplierNode} ExpandedNode */

// Productions that stand for the localizable name itself.
const IDENT_PRODUCTIONS = new Set(["custom-ident", "dashed-ident"]);

/**
 * One grammar with every `<production>` / `<'property'>` reference resolved, so
 * the keyword walk sees one tree. Recursion and function bodies become `opaque`:
 * a name inside `minmax(…)` is not a top-level ident, so no keyword of its own
 * is read there.
 * @param {SyntaxNode} node the node to expand
 * @param {Set<string>} seen productions already on this path
 * @returns {ExpandedNode} the expanded node
 */
const expandValueSyntax = (node, seen) => {
	switch (node.type) {
		case "type": {
			if (IDENT_PRODUCTIONS.has(node.name)) return { type: "ident" };
			const syntax = definitions.get(node.name);
			if (syntax === undefined || seen.has(node.name)) {
				return { type: "opaque" };
			}
			return expandValueSyntax(grammarOf(syntax), new Set(seen).add(node.name));
		}
		case "property": {
			const key = `'${node.name}'`;
			const entry = properties[node.name];
			if (
				entry === undefined ||
				typeof entry.syntax !== "string" ||
				seen.has(key)
			) {
				return { type: "opaque" };
			}
			return expandValueSyntax(grammarOf(entry.syntax), new Set(seen).add(key));
		}
		case "sequence":
		case "oneOf":
		case "anyOf":
		case "allOf":
			return {
				type: node.type,
				items: node.items.map((item) => expandValueSyntax(item, seen))
			};
		case "group":
		case "parens":
			return { type: node.type, body: expandValueSyntax(node.body, seen) };
		case "multiplier":
			return { ...node, body: expandValueSyntax(node.body, seen) };
		case "function":
			return { type: "opaque" };
		default:
			return node;
	}
};

/**
 * Whether a branch *is* the name slot. An opaque alternative doesn't stop it
 * from being one — `<keyframes-name>` is `<custom-ident> | <string>`, and the
 * string spelling is still the name.
 * @param {ExpandedNode} node the branch
 * @returns {boolean} true when the branch is the name
 */
const isIdentBranch = (node) => {
	switch (node.type) {
		case "ident":
			return true;
		case "group":
		case "parens":
		case "multiplier":
			return isIdentBranch(node.body);
		case "oneOf":
			return (
				node.items.some(isIdentBranch) &&
				node.items.every(
					(item) => isIdentBranch(item) || item.type === "opaque"
				)
			);
		default:
			return false;
	}
};

/**
 * Whether the name slot is anywhere under this node.
 * @param {ExpandedNode} node the node
 * @returns {boolean} true when it is
 */
const reachesIdent = (node) => {
	switch (node.type) {
		case "ident":
			return true;
		case "sequence":
		case "oneOf":
		case "anyOf":
		case "allOf":
			return node.items.some(reachesIdent);
		case "group":
		case "parens":
		case "multiplier":
			return reachesIdent(node.body);
		default:
			return false;
	}
};

/**
 * Merge `source` into `target`. A value spells only one branch of an
 * alternation, so those combine by the larger count; everything else can be
 * spelled together, so those add.
 * @param {Map<string, number>} target the table to merge into
 * @param {Map<string, number>} source the table to merge
 * @param {boolean} alternation whether the two are alternatives
 */
const mergeKeywordTable = (target, source, alternation) => {
	for (const [name, count] of source) {
		const previous = target.get(name);
		if (previous === undefined) {
			target.set(name, count);
		} else {
			target.set(
				name,
				alternation ? Math.max(previous, count) : previous + count
			);
		}
	}
};

/**
 * Every keyword under one node, mapped to how many times it may be spelled
 * before the next one is the name.
 * @param {ExpandedNode} node the node
 * @param {boolean} unbounded whether its slot repeats without bound
 * @param {boolean} excluded whether a keyword here can never be the name
 * @returns {Map<string, number>} the keyword table
 */
const keywordTableOf = (node, unbounded, excluded) => {
	/** @type {Map<string, number>} */
	const out = new Map();
	switch (node.type) {
		case "keyword":
			out.set(node.name, unbounded || excluded ? Infinity : 1);
			break;
		case "oneOf": {
			// A keyword spelled as an alternative *of* the name slot cannot also be
			// that name, or the value would be ambiguous.
			const hasIdentBranch = node.items.some(isIdentBranch);
			for (const item of node.items) {
				mergeKeywordTable(
					out,
					keywordTableOf(
						item,
						unbounded,
						excluded || (hasIdentBranch && !isIdentBranch(item))
					),
					true
				);
			}
			break;
		}
		case "allOf": {
			// `&&` requires every operand, so a keyword standing next to the name is
			// excluded from it for the same reason.
			const hasIdent = node.items.some(reachesIdent);
			for (const item of node.items) {
				mergeKeywordTable(
					out,
					keywordTableOf(
						item,
						unbounded,
						excluded || (hasIdent && !reachesIdent(item))
					),
					false
				);
			}
			break;
		}
		case "anyOf":
		case "sequence":
			for (const item of node.items) {
				mergeKeywordTable(
					out,
					keywordTableOf(item, unbounded, excluded),
					false
				);
			}
			break;
		case "group":
		case "parens":
			mergeKeywordTable(
				out,
				keywordTableOf(node.body, unbounded, excluded),
				false
			);
			break;
		case "multiplier":
			// Comma repetition doesn't accumulate — the parser starts a fresh keyword
			// tally at every top-level comma.
			mergeKeywordTable(
				out,
				keywordTableOf(
					node.body,
					unbounded || (!node.comma && node.max === Infinity),
					excluded
				),
				false
			);
			break;
		default:
			break;
	}
	return out;
};

/**
 * The keyword table of one value definition.
 * @param {string} syntax the value definition
 * @returns {Map<string, number>} the keyword table
 */
const keywordTable = (syntax) =>
	keywordTableOf(expandValueSyntax(grammarOf(syntax), new Set()), false, false);

// Which properties a `css/module` reads a scoped name out of, and the parser
// option gating each. Selecting them is webpack's policy, not something a
// dataset states; every keyword below is still derived from the named grammar.
// `@counter-style` descriptors are keyed by descriptor name, which is what the
// parser sees inside the at-rule's block.
/** @type {[string, string, "property" | "counter-style-descriptor"][]} */
const CSS_MODULES_SCOPED_PROPERTIES = [
	["animation", "animation", "property"],
	["animation-name", "animation", "property"],
	["container", "container", "property"],
	["container-name", "container", "property"],
	["list-style", "customIdents", "property"],
	["list-style-type", "customIdents", "property"],
	["system", "customIdents", "counter-style-descriptor"],
	["fallback", "customIdents", "counter-style-descriptor"],
	["speak-as", "customIdents", "counter-style-descriptor"],
	["counter-reset", "customIdents", "property"],
	["counter-increment", "customIdents", "property"],
	["counter-set", "customIdents", "property"],
	["view-transition-name", "customIdents", "property"],
	["view-transition-group", "customIdents", "property"],
	["view-transition-class", "customIdents", "property"],
	["grid", "grid", "property"],
	["grid-area", "grid", "property"],
	["grid-column", "grid", "property"],
	["grid-column-end", "grid", "property"],
	["grid-column-start", "grid", "property"],
	["grid-row", "grid", "property"],
	["grid-row-end", "grid", "property"],
	["grid-row-start", "grid", "property"],
	["grid-template", "grid", "property"],
	["grid-template-areas", "grid", "property"],
	["grid-template-columns", "grid", "property"],
	["grid-template-rows", "grid", "property"]
];

/**
 * @returns {[string, string, [string, number][]][]} each scoped property, its gating option and its keyword table
 */
const collectCssModulesKeywords = () => {
	/** @type {Map<string, [string, number][]>} */
	const supplement = new Map();
	for (const [name, keyword, count] of SUPPLEMENT.cssModulesKeywordSupplement) {
		const entries = supplement.get(name);
		if (entries === undefined) supplement.set(name, [[keyword, count]]);
		else entries.push([keyword, count]);
	}
	const counterStyleDescriptors =
		/** @type {Record<string, { syntax?: string }>} */
		(
			/** @type {{ descriptors?: EXPECTED_OBJECT }} */
			(atRules["@counter-style"]).descriptors
		);
	/** @type {[string, string, [string, number][]][]} */
	const out = [];
	for (const [name, option, kind] of CSS_MODULES_SCOPED_PROPERTIES) {
		const entry =
			/** @type {{ syntax?: string } | undefined} */
			(kind === "property" ? properties[name] : counterStyleDescriptors[name]);
		const table =
			entry === undefined || typeof entry.syntax !== "string"
				? new Map()
				: keywordTable(entry.syntax);
		// A `<counter-style-name>` slot accepts any predefined style by name, so
		// those are keywords there rather than a local `@counter-style`.
		if (
			entry !== undefined &&
			typeof entry.syntax === "string" &&
			[
				...references(entry.syntax),
				...(name === "list-style" ? ["counter-style"] : [])
			].some((reference) => reference.includes("counter-style"))
		) {
			for (const style of SUPPLEMENT.predefinedCounterStyles) {
				if (!table.has(style)) table.set(style, 1);
			}
		}
		for (const [keyword, count] of supplement.get(name) || []) {
			if (!table.has(keyword)) table.set(keyword, count);
		}
		// UA counters are never a local name, whatever the grammar allows.
		if (name.startsWith("counter-")) {
			for (const counter of SUPPLEMENT.predefinedCounterNames) {
				table.set(counter, Infinity);
			}
		}
		// A CSS-wide keyword is never a custom ident. Descriptors take none.
		if (kind === "property") {
			for (const keyword of SUPPLEMENT.cssWideKeywords) {
				table.set(keyword, Infinity);
			}
		}
		out.push([name, option, [...table].sort(([a], [b]) => (a < b ? -1 : 1))]);
	}
	return out;
};

/**
 * Whether a production can be a color without passing through a function of its
 * own. The minifier reads the hash's immediate parent, so a gradient nested in
 * `image-set()` is the gradient's business, not `image-set()`'s — which is why
 * the walk stops at every `name()` production.
 * @param {string} name a production name
 * @param {Set<string>} seen productions already on this path (the grammar is recursive)
 * @returns {boolean} true when a color is reachable
 */
const reachesColor = (name, seen) => {
	if (name === "color" || name === "color-base" || name === "hex-color") {
		return true;
	}
	if (name.endsWith("()") || seen.has(name)) return false;
	seen.add(name);
	const syntax = definitions.get(name);
	if (syntax === undefined) return false;
	return references(syntax).some((child) => reachesColor(child, seen));
};

/**
 * The properties a negative value is valid on. The stated names carry the
 * evidence; a shorthand that states no number of its own and defers entirely to
 * `<'longhand'>` references accepts one exactly when all of them do, which is
 * how `margin` and `inset` are reached from their sides. Iterated to a fixed
 * point so a shorthand of shorthands (`margin-block` off `margin-top`) resolves
 * whichever order the table is in.
 * @returns {string[]} the property names, sorted
 */
const collectNegativeAcceptingProperties = () => {
	const accepting = new Set(SUPPLEMENT.negativeAcceptingProperties);
	for (let changed = true; changed;) {
		changed = false;
		for (const [name, entry] of Object.entries(properties)) {
			if (accepting.has(name) || typeof entry.syntax !== "string") continue;
			/** @type {string[]} */
			const referenced = [];
			let ownNumber = false;
			walkValueSyntax(grammarOf(entry.syntax), (node) => {
				if (node.type === "property") {
					referenced.push(node.name);
				} else if (
					node.type === "type" &&
					numericLeaves(`<${node.name}>`).length
				) {
					ownNumber = true;
				}
			});
			if (ownNumber || referenced.length === 0) continue;
			if (!referenced.every((child) => accepting.has(child))) continue;
			accepting.add(name);
			changed = true;
		}
	}
	return [...accepting].sort();
};

/**
 * The functions with a length argument and no other kind of number, so a zero
 * inside one may drop its unit: a bare `0` is a `<length>` wherever one is accepted. Any
 * other numeric type disqualifies the whole function, because the rewrite would
 * otherwise revive a declaration the engine drops — `scale(0px)` is invalid and
 * `scale(0)` is not.
 * @returns {string[]} the function names, without their parentheses, sorted
 */
const collectLengthOnlyFunctions = () => {
	const names = new Set();
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		const leaves = numericLeaves(syntax);
		if (!leaves.some(([type]) => type === "length")) continue;
		if (leaves.every(([type]) => type === "length" || type === "percentage")) {
			names.add(name.slice(0, -2).toLowerCase());
		}
	}
	return [...names].sort();
};

/**
 * @returns {string[]} the functions that take a color argument directly, sorted
 */
const collectColorArgumentFunctions = () => {
	/** @type {string[]} */
	const names = [];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).some((child) => reachesColor(child, new Set()))) {
			names.push(name.slice(0, -2));
		}
	}
	return names.sort();
};

// Arbitrary substitution functions CSS Values 5 defines but `mdn-data` does not
// describe yet, so the derivation below cannot see them.
const EXTRA_SUBSTITUTION_FUNCTIONS = [
	"first-valid",
	"if",
	"inherit",
	"random-item"
];

/**
 * The functions every argument of which is an angle, spotted by the `<zero>`
 * their own grammar names alongside `<angle>` and by naming no other type.
 * `rotate3d()` is excluded by that second test: its first three arguments are
 * `<number>`s, so a `0deg` there is a declaration the engine drops, and giving
 * it a unitless zero would revive one.
 * @returns {string[]} the function names, sorted
 */
const collectZeroAngleFunctions = () => {
	const names = [];
	for (const [name, entry] of Object.entries(functions)) {
		if (typeof entry.syntax !== "string") continue;
		if (!entry.syntax.includes("<zero>")) continue;
		if (!name.endsWith("()")) continue;
		const types = entry.syntax.match(/<[a-z-]+>/g) || [];
		if (types.some((one) => one !== "<angle>" && one !== "<zero>")) continue;
		// Function names match ASCII case-insensitively; the printer lowercases.
		names.push(name.slice(0, -2).toLowerCase());
	}
	return names.sort();
};

/**
 * The pseudo-class functions taking An+B, spotted by the `<an+b>` their own
 * grammar names — the notation `odd` and `even` are the keywords of.
 * @returns {string[]} the function names, sorted
 */
const collectNthPseudoFunctions = () => {
	const names = [];
	for (const [name, entry] of Object.entries(selectors)) {
		if (entry.status !== "standard") continue;
		if (typeof entry.syntax !== "string") continue;
		// The An+B pseudo-classes are exactly the ones whose grammar names it.
		if (!entry.syntax.includes("<an+b>")) continue;
		if (!name.startsWith(":") || !name.endsWith("()")) continue;
		names.push(name.slice(1, -2));
	}
	return names.sort();
};

// A production naming a selector: what a function taking one has in its grammar.
const SELECTOR_PRODUCTION_REGEXP = /<[a-z-]*selector[a-z-]*>/;

/**
 * The functions whose argument is a selector, spotted by the selector
 * production their own grammar names — inside one a `>` / `+` / `~` is a
 * combinator, so the whitespace around it carries nothing. Both spellings are
 * read: a pseudo-class from the selector table, and `selector()` from the
 * syntax that defines `@supports`'s form of it.
 * @returns {string[]} the function names, sorted
 */
const collectSelectorFunctions = () => {
	const names = new Set();
	for (const [name, entry] of Object.entries(selectors)) {
		if (entry.status !== "standard") continue;
		if (typeof entry.syntax !== "string") continue;
		if (!SELECTOR_PRODUCTION_REGEXP.test(entry.syntax)) continue;
		const fn = /^::?([a-z-]+)\(\)$/.exec(name);
		if (fn !== null) names.add(fn[1]);
	}
	for (const [, syntax] of definitions) {
		// `supports-selector-fn` is `selector( <complex-selector> )`.
		const fn = /^([a-z-]+)\(\s*<[a-z-]*selector[a-z-]*>/.exec(syntax);
		if (fn !== null) names.add(fn[1]);
	}
	return [...names].sort();
};

/**
 * The functions that substitute an arbitrary token sequence, spotted by the
 * `<declaration-value>` in their own syntax — that production _is_ "any token
 * sequence". Over-inclusive by design: `paint()`'s trailing arguments are the
 * worklet's, not a substituted value, but declining a collapse only costs bytes.
 * @returns {string[]} the function names, sorted
 */
const collectSubstitutionFunctions = () => {
	const names = [...EXTRA_SUBSTITUTION_FUNCTIONS];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).includes("declaration-value")) {
			names.push(name.slice(0, -2));
		}
	}
	return names.sort();
};

// The productions that only a math expression is written with, so a function
// referencing one takes math expressions and nothing else.
const MATH_PRODUCTIONS = ["calc-sum", "calc-product", "calc-value"];

/**
 * CSS Values 4's math functions, spotted by the `<calc-sum>` in their own
 * syntax: inside one, everything is a math expression, so `*` and `/` there are
 * operators the whitespace around carries nothing for.
 * @returns {string[]} the function names, sorted
 */
const collectMathFunctions = () => {
	/** @type {string[]} */
	const names = [];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).some((child) => MATH_PRODUCTIONS.includes(child))) {
			names.push(name.slice(0, -2));
		}
	}
	return names.sort();
};

/**
 * @param {number[]} channels the `[r, g, b]` bytes
 * @returns {string} the shortest hex spelling — 3 digits when every byte is a repeated pair
 */
const hex = (channels) => {
	const digits = channels
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return digits[0] === digits[1] &&
		digits[2] === digits[3] &&
		digits[4] === digits[5]
		? `#${digits[0]}${digits[2]}${digits[4]}`
		: `#${digits}`;
};

/**
 * The named colors that beat their own hex spelling, as packed `0xrrggbb` ->
 * name — so the minifier looks a name up and uses it if there is one, with no
 * length test of its own. Both datasets must list exactly the same names:
 * `mdn-data` is the spec's list and `color-name` the byte values, so a
 * disagreement means one of them moved and the table can no longer be trusted.
 * @returns {[number, string][]} the entries, sorted by packed value
 */
const collectColorNames = () => {
	const spec = syntaxes["named-color"].syntax
		.split("|")
		.map((name) => name.trim());
	const values = Object.keys(colorName);
	const missing = spec.filter((name) => !(name in colorName));
	const extra = values.filter((name) => !spec.includes(name));
	if (missing.length !== 0 || extra.length !== 0) {
		throw new Error(
			`mdn-data and color-name disagree on the named colors: ${
				missing.length !== 0 ? `no value for ${missing.join(", ")}; ` : ""
			}${extra.length !== 0 ? `not in the spec list: ${extra.join(", ")}` : ""}`
		);
	}
	/** @type {Map<number, string>} */
	const shortest = new Map();
	// Sorted, so two names of the same length (`aqua`/`cyan`, `gray`/`grey`)
	// always resolve to the same one.
	for (const name of [...spec].sort()) {
		const channels = colorName[name];
		if (name.length >= hex(channels).length) continue;
		const [red, green, blue] = channels;
		const packed = (red << 16) | (green << 8) | blue;
		const previous = shortest.get(packed);
		if (previous === undefined || name.length < previous.length) {
			shortest.set(packed, name);
		}
	}
	return [...shortest].sort((a, b) => a[0] - b[0]);
};

/**
 * The other side of the same table: each named color that its own hex — or a
 * shorter name for the same value — beats, as name -> that shorter spelling.
 * `collectColorNames` already says which value each name carries and which name
 * wins a value, so this is that pair read back rather than a second list.
 * @param {[number, string][]} colorNames the packed-value -> shortest-name entries
 * @returns {[string, string][]} the entries, sorted by name
 */
const collectShortenableColorNames = (colorNames) => {
	const byValue = new Map(colorNames);
	const spec = syntaxes["named-color"].syntax
		.split("|")
		.map((name) => name.trim());
	/** @type {[string, string][]} */
	const out = [];
	for (const name of spec) {
		const channels = colorName[name];
		const [red, green, blue] = channels;
		const packed = (red << 16) | (green << 8) | blue;
		// Whichever the minifier would print for this value, hex or a name.
		const winner = byValue.get(packed) || hex(channels);
		if (winner.length < name.length) out.push([name, winner]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * @param {string[]} names entries
 * @returns {string} its `new Set([…])` literal — prettier wraps it on emit
 */
const setLiteral = (names) =>
	`new Set([${names.map((name) => `"${name}"`).join(", ")}])`;

/**
 * @param {[string, string][]} entries the table
 * @returns {string} its `new Map([…])` literal — prettier wraps it on emit
 */
const mapLiteral = (entries) =>
	`new Map([${entries.map(([key, value]) => `["${key}", "${value}"]`).join(", ")}])`;

/**
 * @param {[number, number][]} entries number-keyed pairs
 * @returns {string} the `Map` literal
 */
const numberMapLiteral = (entries) =>
	`new Map([${entries.map(([key, value]) => `[${key}, ${value}]`).join(", ")}])`;

/**
 * A trig table as `eighth turn -> value`, the irrational eighths simply absent
 * — the same "not in the table, not foldable" rule the inverses already use.
 * @param {(number | null)[]} values the value at each eighth
 * @returns {[number, number][]} the entries
 */
const eighthTurnEntries = (values) => {
	/** @type {[number, number][]} */
	const out = [];
	for (const [eighth, value] of values.entries()) {
		if (value !== null) out.push([eighth, value]);
	}
	return out;
};

// Spec prose no dataset states: an equivalence between two spellings, or a
// judgement about what a construct still does. Each carries the reason it has to
// be written out rather than derived.
/** @type {{ cssWideKeywords: string[], cubicBezierKeywords: [string, string][], flexKeywords: [string, string][], fontWeightNumbers: [string, string][], legacyPseudoElements: string[], compoundContinuations: string[], zeroUnitKeepingProperties: string[], negativeAcceptingProperties: string[], newerPairShorthands: string[], oneValuePairShorthands: string[], familyShorthands: string[], pairLonghandOverrides: [string, string[]][], droppableWhenEmptyAtRules: string[], absoluteUnitScale: [string, string, number][], unitConversionTargets: string[], angleUnits: string[], quarterTurnAngle: [string, number][], eighthTurnSine: (number | null)[], eighthTurnTangent: (number | null)[], mathFunctionFold: [string, string, string, string, string | null, boolean][], mathPrimitives: [string, string][], predefinedCounterStyles: string[], predefinedCounterNames: string[], cssModulesKeywordSupplement: [string, string, number][] }} */

const SUPPLEMENT = {
	// CSS Values 4's list. `mdn-data` has no `css-wide-keyword` production.
	cssWideKeywords: ["inherit", "initial", "revert", "revert-layer", "unset"],
	// CSS Easing 1 §2 defines each keyword as exactly this curve; the syntax
	// database describes `cubic-bezier()`'s shape, not which curves have a name.
	// Keyed by the arguments as `Number` prints them.
	cubicBezierKeywords: [
		["0.25,0.1,0.25,1", "ease"],
		["0,0,1,1", "linear"],
		["0.42,0,1,1", "ease-in"],
		["0,0,0.58,1", "ease-out"],
		["0.42,0,0.58,1", "ease-in-out"]
	],
	// CSS Flexbox 7.1.1's two keyword spellings. `1 1 0` is deliberately absent:
	// the one-value `flex:1` expands to `1 1 0%`, and a length `0` is not a
	// percentage `0%` when the container's main size is indefinite.
	flexKeywords: [
		["0 0 auto", "none"],
		["1 1 auto", "auto"]
	],
	// CSS Fonts 4 §2.2 defines these two keywords as those weights, and the
	// computed value is the number either way. `bolder` / `lighter` are relative
	// to the parent's weight, so they have no fixed number.
	fontWeightNumbers: [
		["normal", "400"],
		["bold", "700"]
	],
	// Selectors 4 §3.3: engines must accept the one-colon spelling for the
	// pseudo-elements CSS 1 and 2 introduced. Only these four — `::selection` and
	// the rest have no legacy spelling.
	legacyPseudoElements: ["before", "after", "first-line", "first-letter"],
	// What may follow the `*` a compound selector implies: another simple
	// selector in the same compound. Selector syntax, not a value grammar.
	compoundContinuations: [":", ".", "#", "["],
	// `flex-basis` is the one place a zero's unit is still load-bearing: IE 11
	// drops a `flex` shorthand whose basis has none, and the shorthand carries
	// one too.
	zeroUnitKeepingProperties: ["flex", "flex-basis"],
	// Pair shorthands materially newer than the longhands they merge, so a target
	// reading the longhands may not read the shorthand — and the merge would lose
	// both declarations rather than one. `overflow-x`/`-y` and `align-items` are
	// as old as CSS 2 / flexbox, while two-value `overflow` and `place-items` are
	// 2018-era. `output.environment` states this for `inset` alone, so the rest
	// are named here.
	newerPairShorthands: ["place-content", "place-items", "place-self"],
	// Pair shorthands whose *two-value* form is the newer one, so the merge is
	// safe only where it collapses to a single value: `overflow: hidden` is CSS
	// 2.1 and reads everywhere `overflow-x` does, while `overflow: hidden scroll`
	// is 2018-era. Every other name above is newer in its one-value form too.
	oneValuePairShorthands: ["overflow"],
	// The `||`-of-longhands shorthands a merge may emit. Positive evidence, so
	// named rather than derived twice over: `mdn-data`'s `computed` under-reports
	// what a shorthand resets (`border` clears `border-image`, `font` clears
	// `font-size-adjust`), and states no version, so neither "resets nothing
	// else" nor "as old as its longhands" is readable from it. Each name below
	// was checked in headless Chromium against a block that also set every other
	// property in the family, and none of them lost one: `outline` keeps
	// `outline-offset`, `text-decoration` keeps `text-decoration-skip-ink` and
	// both `text-underline-*`, `text-emphasis` keeps `text-emphasis-position`.
	// `caret` is the one candidate left out — it is far newer than `caret-color`.
	familyShorthands: [
		"column-rule",
		"flex-flow",
		"list-style",
		"outline",
		"text-decoration",
		"text-emphasis",
		"text-wrap"
	],
	// Two longhands `mdn-data` maps to the wrong pair. Corrected from headless
	// Chromium, which computes `corner-inline-start-shape` onto the two corners
	// on the inline-start edge; the table gives it the block-start edge's pair,
	// the one `corner-block-start-shape` already holds.
	pairLonghandOverrides: [
		[
			"corner-inline-start-shape",
			["corner-start-start-shape", "corner-end-start-shape"]
		]
	],
	// The properties a negative value is valid on, which decides whether
	// `calc(-5px)` may lose its parentheses. Not derivable: every range
	// `mdn-data` states is a non-negative one (`[0,∞]`, `[0,100]`, `[1,∞]`,
	// `[0,1]`, `[1,1000]`), so an absent annotation is silence rather than
	// permission — `<line-width>` carries none yet rejects a negative, and
	// unwrapping there would turn a clamped `0` into a dropped declaration.
	// Each name below was checked in headless Chromium: the bare spelling has
	// to compute to the negative, not merely agree with the wrapped one, since
	// two declarations that are both dropped agree while accepting nothing.
	// Only the names needing that evidence are listed — a shorthand that reaches
	// its numbers solely through `<'longhand'>` references is derived below.
	negativeAcceptingProperties: [
		"animation-delay",
		"background-position",
		"background-position-x",
		"background-position-y",
		"bottom",
		"inset-block-end",
		"inset-block-start",
		"inset-inline-end",
		"inset-inline-start",
		"left",
		"letter-spacing",
		"margin-block-end",
		"margin-block-start",
		"margin-bottom",
		"margin-inline-end",
		"margin-inline-start",
		"margin-left",
		"margin-right",
		"margin-top",
		"offset-distance",
		"order",
		"outline-offset",
		"perspective-origin",
		"right",
		"rotate",
		"scroll-margin",
		"scroll-margin-block",
		"scroll-margin-bottom",
		"scroll-margin-inline",
		"scroll-margin-left",
		"scroll-margin-right",
		"scroll-margin-top",
		"stroke-dashoffset",
		"text-indent",
		"text-underline-offset",
		"top",
		"transform-origin",
		"transition-delay",
		"translate",
		"vertical-align",
		"word-spacing",
		"z-index"
	],
	// At-rules whose empty block is inert. Not `@keyframes` (an empty one still
	// runs the animation, firing its events) and not `@layer` (an empty block
	// declares the layer's cascade order).
	droppableWhenEmptyAtRules: ["media", "supports", "container"],
	// CSS Values 4 §6.2 and §8: the units fixed against each other. `units.json`
	// names them but states neither their type nor the ratios. Counted in a base
	// that makes every one an integer — 1/36576 inch, the smallest subdivision
	// that clears both the 96/72/6 divisors and the 127 in `2.54` — so the
	// ratios carry no float error of their own and a conversion either divides
	// exactly or is declined.
	absoluteUnitScale: [
		["px", "length", 381],
		["pc", "length", 6096],
		["pt", "length", 508],
		["in", "length", 36576],
		["cm", "length", 14400],
		["mm", "length", 1440],
		["q", "length", 360],
		["ms", "time", 1],
		["s", "time", 1000]
	],
	// The units a conversion may emit — every one of them CSS 2.1's, so no engine
	// reading the stylesheet can fail to read the rewritten unit. `q` is a source
	// only: CSS Values 3 added it, and Safari did not read it before 15.
	unitConversionTargets: ["px", "pc", "pt", "in", "cm", "mm", "ms", "s"],
	// The angle units, which are excluded from rounding: `rotate()` runs its
	// argument through trig, which amplifies a truncated digit into a different
	// computed matrix (measured in headless Chromium).
	angleUnits: ["deg", "grad", "rad", "turn"],
	// CSS Values 4 §8.1: a quarter turn, in each unit that spells it exactly.
	// The trig functions are only folded on these, so the table is what says
	// where. `rad` has no entry — a quarter turn is π/2 of them, which no double
	// is — and, like the ratios above, no dataset states any of this.
	quarterTurnAngle: [
		["deg", 90],
		["grad", 100],
		["turn", 0.25]
	],
	// Sine and tangent an eighth turn apart, `null` where the value is
	// irrational. `Math.sin` cannot supply either — `Math.sin(Math.PI)` is
	// 1.2e-16 rather than 0, and a table that says a value is exactly zero is the
	// whole point. Tangent is stated beside sine rather than divided out of it:
	// on the odd eighths sine and cosine are both irrational and their ratio is
	// not, which no table of the two can show. Cosine and the three inverses are
	// derived below.
	eighthTurnSine: [0, null, 1, null, 0, null, -1, null],
	eighthTurnTangent: [0, 1, null, -1, 0, 1, null, -1],
	// What folding each math function comes down to. The grammars state only the
	// shape — every argument of every one of them is a `<calc-sum>` — so what a
	// function *means* is spelled out here, as the three things the minifier's
	// engine needs and nothing more:
	//
	//   read   which reader in `lib/css/mathPrimitives.js` reads its arguments
	//   apply  which arithmetic there runs — one entry however many functions
	//          select it, so the six trig ones share `lookup` between them
	//   result the unit the answer carries: `same` as its arguments, `` for a
	//          number, or an angle unit
	//
	// `read` and `apply` are the exported names, and the generated table holds
	// the functions themselves rather than the names — a name no longer exported
	// fails generation instead of quietly unfolding nothing.
	//
	// Adding a function is adding a line here; a name whose arithmetic is already
	// implemented needs nothing else. `calc()` has no entry — it is not one value
	// but whatever sum its argument reduced to — and `calc-size()` none either,
	// since it leads with a basis rather than an expression.
	//
	// `stepped` marks the ones whose result is a step of their arguments, where a
	// unit rewrite that holds everywhere else does not: `4.5cm` and `45mm` are
	// the same length, but headless Chromium reads `round(down,4.5cm,1.5cm)` as
	// `3cm` and `round(down,45mm,15mm)` as `4.5cm`.
	mathFunctionFold: [
		["abs", "readSameUnit", "absolute", "same", null, false],
		["acos", "readNumber", "lookup", "deg", "ARC_COSINE_DEGREES", false],
		["asin", "readNumber", "lookup", "deg", "ARC_SINE_DEGREES", false],
		["atan", "readNumber", "lookup", "deg", "ARC_TANGENT_DEGREES", false],
		["atan2", "readSameUnit", "arcTangent2", "deg", null, false],
		["clamp", "readSameUnit", "clamp", "same", null, false],
		["cos", "readEighthTurn", "lookup", "", "EIGHTH_TURN_COSINE", false],
		["exp", "readNumber", "exponential", "", null, false],
		["hypot", "readSameUnit", "hypotenuse", "same", null, false],
		["log", "readNumber", "logarithm", "", null, false],
		["max", "readSameUnit", "maximum", "same", null, false],
		["min", "readSameUnit", "minimum", "same", null, false],
		["mod", "readSameUnit", "modulus", "same", null, true],
		["pow", "readNumber", "power", "", null, false],
		["rem", "readSameUnit", "remainder", "same", null, true],
		["round", "readSameUnit", "round", "same", null, true],
		["sign", "readSameUnit", "sign", "", null, false],
		["sin", "readEighthTurn", "lookup", "", "EIGHTH_TURN_SINE", false],
		["sqrt", "readNumber", "squareRoot", "", null, false],
		["tan", "readEighthTurn", "lookup", "", "EIGHTH_TURN_TANGENT", false]
	],
	// The arithmetic each math function folds by, in dependency order. No dataset
	// states any of it — the grammars say only that every argument is a
	// `<calc-sum>` — and it is emitted from here rather than written beside the
	// printer so that one file carries both what each function does and the
	// arithmetic it does it with. `lib/css/syntax.js` then names neither.
	//
	// Every operation answers a number or `null`, and `null` leaves the call
	// written out. That is the discipline the whole fold rests on: a folded
	// expression is no longer there for the engine to recompute, so a result
	// carrying any rounding of its own is declined rather than printed.
	mathPrimitives: [
		[
			"exactAdd",
			`/**
 * Add two doubles, or decline when the sum carries rounding of its own.
 * @param {number} a one term
 * @param {number} b the other
 * @returns {number | null} their exact sum, or \`null\`
 */
const exactAdd = (a, b) => {
	const sum = a + b;
	return sum - b === a && sum - a === b ? sum : null;
};`
		],
		[
			"exactMultiply",
			`/**
 * Multiply, or decline, on the same terms.
 * @param {number} a the value
 * @param {number} k the factor
 * @returns {number | null} their exact product, or \`null\`
 */
const exactMultiply = (a, k) => {
	const product = a * k;
	if (!Number.isFinite(product)) return null;
	if (a === 0 || k === 0) return product;
	return product / k === a ? product : null;
};`
		],
		[
			"exactDivide",
			`/**
 * Divide, or decline, on the same terms.
 * @param {number} a the value
 * @param {number} k the divisor
 * @returns {number | null} their exact quotient, or \`null\`
 */
const exactDivide = (a, k) => {
	if (k === 0) return null;
	const quotient = a / k;
	if (!Number.isFinite(quotient)) return null;
	return quotient * k === a ? quotient : null;
};`
		],
		[
			"exactFloorDivide",
			`/**
 * \`floor(value / step)\` for a positive step, checked against the step exactly.
 * The double quotient can land an ulp either side of an integer, which would put
 * the multiple a whole step out, so the candidate is verified by multiplying
 * back and nudged at most once either way.
 * @param {number} value the dividend
 * @param {number} step the divisor, greater than zero
 * @returns {number | null} the floor, or \`null\` when it cannot be pinned down
 */
const exactFloorDivide = (value, step) => {
	let n = Math.floor(value / step);
	if (!Number.isFinite(n)) return null;
	for (let attempt = 0; attempt < 3; attempt++) {
		const at = exactMultiply(n, step);
		const next = exactMultiply(n + 1, step);
		if (at === null || next === null) return null;
		if (at > value) {
			n--;
			continue;
		}
		if (next <= value) {
			n++;
			continue;
		}
		return n;
	}
	return null;
};`
		],
		[
			"exactSquareRoot",
			`/**
 * The square root of a value, where it is one that can be written down. IEEE-754
 * makes \`Math.sqrt\` correctly rounded, so squaring the result back is a complete
 * test — and it fails for every irrational root, which is most of them.
 * @param {number} value the radicand
 * @returns {number | null} the root, or \`null\`
 */
const exactSquareRoot = (value) => {
	if (!(value >= 0)) return null;
	const root = Math.sqrt(value);
	const back = exactMultiply(root, root);
	return back === null || back !== value ? null : root;
};`
		],
		[
			"POWER_LIMIT",
			`// Beyond this an integer exponent is not worth multiplying out, and every result
// overflows a double for all but a base within an ulp of 1.
const POWER_LIMIT = 64;`
		],
		[
			"exactIntegerPower",
			`/**
 * \`base ** exponent\` for a whole exponent, by multiplying out. Every step is
 * checked, so the result is the one an engine computing in doubles gets — which
 * \`Math.pow\` is not required to be for a general exponent.
 * @param {number} base the base
 * @param {number} exponent a whole exponent
 * @returns {number | null} the power, or \`null\`
 */
const exactIntegerPower = (base, exponent) => {
	if (!Number.isInteger(exponent) || Math.abs(exponent) > POWER_LIMIT) {
		return null;
	}
	let power = 1;
	for (let n = Math.abs(exponent); n > 0; n--) {
		const next = exactMultiply(power, base);
		if (next === null) return null;
		power = next;
	}
	return exponent < 0 ? exactDivide(1, power) : power;
};`
		],
		[
			"readSameUnit",
			`/**
 * One evaluated argument list, read as a shared unit and its coefficients. A
 * percentage is refused: its basis can be negative (a \`background-position\`
 * against an image wider than its box), and comparing two of them depends on
 * that sign in a way \`calc()\`'s arithmetic does not — scaling a percentage is
 * linear, picking the smaller of two is not.
 * @param {Map<string, number>[]} sums the evaluated arguments
 * @returns {[string, number[]] | null} the shared unit and the coefficients
 */
const readSameUnit = (sums) => {
	/** @type {string | null} */
	let shared = null;
	/** @type {number[]} */
	const values = [];
	for (const sum of sums) {
		if (sum.size !== 1) return null;
		const [[key, coefficient]] = sum;
		if (key === "%") return null;
		if (shared === null) shared = key;
		else if (shared !== key) return null;
		values.push(coefficient);
	}
	return shared === null ? null : [shared, values];
};`
		],
		[
			"readNumber",
			`/**
 * The same, narrowed to arguments that reduced to a plain \`<number>\`.
 * @param {Map<string, number>[]} sums the evaluated arguments
 * @returns {[string, number[]] | null} the unit (always \`""\`) and the numbers
 */
const readNumber = (sums) => {
	const shared = readSameUnit(sums);
	return shared === null || shared[0] !== "" ? null : shared;
};`
		],
		[
			"eighthTurnReader",
			`/**
 * A reader answering which eighth turn a single angle argument is, as the one
 * "coefficient" — a lookup key rather than a magnitude, which \`lookup\` takes. A
 * plain number is an angle in radians, where only zero lands on a whole one.
 * @param {Map<string, number>} quarterTurnAngle a quarter turn in each unit that spells one exactly
 * @returns {(sums: Map<string, number>[]) => [string, number[]] | null} the reader
 */
const eighthTurnReader = (quarterTurnAngle) => (sums) => {
	const shared = readSameUnit(sums);
	if (shared === null) return null;
	const [unit, [angle]] = shared;
	if (unit === "") return angle === 0 ? ["", [0]] : null;
	const quarter = quarterTurnAngle.get(unit);
	if (quarter === undefined) return null;
	// Halving a quarter turn is exact in each unit that spells one: 45, 50 and an
	// eighth, which is a power of two.
	const eighths = exactDivide(angle, quarter / 2);
	if (eighths === null || !Number.isInteger(eighths)) return null;
	return ["", [((eighths % 8) + 8) % 8]];
};`
		],
		[
			"minimum",
			`/**
 * @param {number[]} values the coefficients
 * @returns {number} the smallest
 */
const minimum = (values) => Math.min(...values);`
		],
		[
			"maximum",
			`/**
 * @param {number[]} values the coefficients
 * @returns {number} the largest
 */
const maximum = (values) => Math.max(...values);`
		],
		[
			"clamp",
			`/**
 * CSS Values 4 §10.4: the lower bound wins a contradictory pair.
 * @param {number[]} values the lower bound, the value and the upper bound
 * @returns {number} the value held between them
 */
const clamp = ([lower, value, upper]) =>
	Math.max(lower, Math.min(value, upper));`
		],
		[
			"absolute",
			`/**
 * @param {number[]} values the one coefficient
 * @returns {number} its magnitude
 */
const absolute = ([value]) => Math.abs(value);`
		],
		[
			"sign",
			`/**
 * The one operation whose answer changes unit: a sign is a \`<number>\`. Every
 * unit reaching here scales by a positive factor, so the coefficient's sign is
 * the value's even where the factor is not known.
 * @param {number[]} values the one coefficient
 * @returns {number} its sign
 */
const sign = ([value]) => Math.sign(value);`
		],
		[
			"hypotenuse",
			`/**
 * @param {number[]} values the coefficients
 * @returns {number | null} the root of their sum of squares, or \`null\`
 */
const hypotenuse = (values) => {
	let total = 0;
	for (const value of values) {
		const square = exactMultiply(value, value);
		if (square === null) return null;
		const sum = exactAdd(total, square);
		if (sum === null) return null;
		total = sum;
	}
	return exactSquareRoot(total);
};`
		],
		[
			"round",
			`/**
 * The multiple of \`step\` that \`strategy\` rounds \`value\` to, as CSS Values 4
 * §10.6 defines them and headless Chromium confirms: \`nearest\` breaks a tie
 * toward positive infinity, and the other three are the ceiling, the floor and
 * the truncation. A step of zero is NaN per the spec and engines do not agree
 * on what that renders as; a negative one is left alone rather than reasoned
 * about.
 * @param {number[]} values the value and the step
 * @param {string} strategy one of the grammar's rounding strategies
 * @returns {number | null} the rounded multiple, or \`null\`
 */
const round = ([value, step], strategy) => {
	if (!(step > 0)) return null;
	const below = exactFloorDivide(value, step);
	if (below === null) return null;
	const at = /** @type {number} */ (exactMultiply(below, step));
	// Exactly on a step is where engines stop agreeing: these are step functions,
	// so an ulp of error in the engine's own conversion moves the answer a whole
	// step. Headless Chromium reads \`round(down,10cm,2cm)\` as \`8cm\` and
	// \`round(down,-7cm,.5cm)\` as \`-7.5cm\`. Away from a boundary the gap is orders
	// of magnitude wider than any such error, so only the boundary is refused.
	if (at === value) return null;
	let multiple;
	if (strategy === "down") {
		multiple = below;
	} else if (strategy === "up") {
		multiple = below + 1;
	} else if (strategy === "to-zero") {
		multiple = value < 0 ? below + 1 : below;
	} else {
		// The remainder is in \`[0, step)\`, so twice it against the step is the
		// comparison, and an exact half rounds up — toward positive infinity.
		const remainder = exactAdd(value, -at);
		if (remainder === null) return null;
		const doubled = exactMultiply(remainder, 2);
		if (doubled === null) return null;
		multiple = doubled >= step ? below + 1 : below;
	}
	return exactMultiply(multiple, step);
};`
		],
		[
			"modulus",
			`/**
 * The remainder carrying the divisor's sign.
 * @param {number[]} values the dividend and the divisor
 * @returns {number | null} the remainder, or \`null\`
 */
const modulus = ([value, divisor]) => {
	if (divisor === 0) return null;
	const remainder = value % divisor;
	// A zero remainder is the boundary these two share with \`round()\`, and engines
	// do not agree on it: headless Chromium reads \`mod(10px,-2px)\` and
	// \`mod(-9px,3px)\` as the divisor where both are zero.
	if (remainder === 0) return null;
	// A remainder on the other side of zero is brought back across it.
	return remainder < 0 === divisor < 0
		? remainder
		: exactAdd(remainder, divisor);
};`
		],
		[
			"remainder",
			`/**
 * The remainder carrying the dividend's sign, which is what \`%\` already does.
 * @param {number[]} values the dividend and the divisor
 * @returns {number | null} the remainder, or \`null\`
 */
const remainder = ([value, divisor]) => {
	if (divisor === 0) return null;
	// The same zero boundary \`modulus\` declines.
	const rest = value % divisor;
	return rest === 0 ? null : rest;
};`
		],
		[
			"squareRoot",
			`/**
 * @param {number[]} values the one radicand
 * @returns {number | null} its root, or \`null\`
 */
const squareRoot = ([value]) => exactSquareRoot(value);`
		],
		[
			"power",
			`/**
 * @param {number[]} values the base and the exponent
 * @returns {number | null} the power, or \`null\`
 */
const power = ([base, exponent]) => exactIntegerPower(base, exponent);`
		],
		[
			"logarithm",
			`/**
 * A logarithm is transcendental except where it lands on a whole power of its
 * base, so the candidate is raised back and only an exact match is taken. The
 * natural logarithm's base is not a double at all, which leaves only \`log(1)\`.
 * @param {number[]} values the value and, optionally, the base
 * @returns {number | null} the logarithm, or \`null\`
 */
const logarithm = ([value, base]) => {
	if (base === undefined) return value === 1 ? 0 : null;
	const exponent = Math.round(Math.log(value) / Math.log(base));
	const back = exactIntegerPower(base, exponent);
	return back === null || back !== value ? null : exponent;
};`
		],
		[
			"exponential",
			`/**
 * \`e\` is not a double, so every other power of it is a number this cannot write
 * down and an engine's math library rounds its own way.
 * @param {number[]} values the one exponent
 * @returns {number | null} the power of \`e\`, or \`null\`
 */
const exponential = ([value]) => (value === 0 ? 1 : null);`
		],
		[
			"lookup",
			`/**
 * Read the answer out of the table the descriptor carries. Absent means the
 * value is one no stylesheet can hold, so the call stays written out.
 * @param {number[]} values the one lookup key
 * @param {string} _strategy unused
 * @param {Map<number, number> | null} table the descriptor's table
 * @returns {number | null} the answer, or \`null\`
 */
const lookup = ([key], _strategy, table) => {
	const value = /** @type {Map<number, number>} */ (table).get(key);
	return value === undefined ? null : value;
};`
		],
		[
			"arcTangent2",
			`/**
 * The eight directions the arc tangent of a ratio is a whole number of degrees
 * in, an eighth turn apart. Both zero is refused: the spec leaves it to the
 * engine.
 * @param {number[]} values the two coordinates
 * @returns {number | null} the angle in degrees, or \`null\`
 */
const arcTangent2 = ([y, x]) => {
	if (y === 0 && x === 0) return null;
	if (y === 0) return x > 0 ? 0 : 180;
	if (x === 0) return y > 0 ? 90 : -90;
	if (Math.abs(y) !== Math.abs(x)) return null;
	if (x > 0) return y > 0 ? 45 : -45;
	return y > 0 ? 135 : -135;
};`
		]
	],
	// CSS Counter Styles 3 §6's predefined styles. `mdn-data` models
	// `<counter-style-name>` as a bare `<custom-ident>`, so the names a UA already
	// defines are nowhere in the dataset — but a stylesheet naming one means the
	// predefined style, not a local `@counter-style`, so they must not be scoped.
	predefinedCounterStyles: [
		"arabic-indic",
		"armenian",
		"bengali",
		"cambodian",
		"circle",
		"cjk-decimal",
		"cjk-earthly-branch",
		"cjk-heavenly-stem",
		"cjk-ideographic",
		"decimal",
		"decimal-leading-zero",
		"devanagari",
		"disc",
		"disclosure-closed",
		"disclosure-open",
		"ethiopic-numeric",
		"georgian",
		"gujarati",
		/* cspell:disable-next-line */
		"gurmukhi",
		"hebrew",
		"hiragana",
		/* cspell:disable-next-line */
		"hiragana-iroha",
		"japanese-formal",
		"japanese-informal",
		"kannada",
		"katakana",
		/* cspell:disable-next-line */
		"katakana-iroha",
		"khmer",
		"korean-hangul-formal",
		/* cspell:disable-next-line */
		"korean-hanja-formal",
		/* cspell:disable-next-line */
		"korean-hanja-informal",
		"lao",
		"lower-alpha",
		"lower-armenian",
		"lower-greek",
		"lower-latin",
		"lower-roman",
		"malayalam",
		"mongolian",
		"myanmar",
		"oriya",
		"persian",
		"simp-chinese-formal",
		"simp-chinese-informal",
		"square",
		"tamil",
		"telugu",
		"thai",
		"tibetan",
		"trad-chinese-formal",
		"trad-chinese-informal",
		"upper-alpha",
		"upper-armenian",
		"upper-latin",
		"upper-roman"
	],
	// UA-maintained counters: `list-item` numbers a list, `page` / `pages` are the
	// paged-media counters. `<counter-name>` is a bare `<custom-ident>` in the
	// dataset, so nothing there says a UA already increments these.
	predefinedCounterNames: ["list-item", "page", "pages"],
	// Keyword slots the published grammars do not carry yet. Each is a keyword a
	// value can spell where a scoped name would otherwise be read, so leaving it
	// out would localize it.
	// Each entry is `[property, keyword, count]`, with `count` read the same way
	// as a derived one — `Infinity` for a keyword the name slot excludes.
	cssModulesKeywordSupplement: [
		// `view-transition-group` has no `mdn-data` entry at all, and
		// `view-transition-name` predates the `auto` the spec since added. Both
		// spell their keywords as alternatives of the name, so none is ever one.
		["view-transition-group", "normal", Infinity],
		["view-transition-group", "contain", Infinity],
		["view-transition-group", "nearest", Infinity],
		["view-transition-name", "auto", Infinity],
		// CSS Grid 3's masonry track value, not yet in the published grammar.
		["grid-template-columns", "masonry", 1],
		["grid-template-rows", "masonry", 1],
		["grid-template", "masonry", 1],
		["grid", "masonry", 1],
		// The `grid` shorthand spells `auto-flow` literally rather than referencing
		// `<'grid-auto-flow'>`, so that longhand's own keywords are not reachable
		// from the shorthand's grammar.
		["grid", "row", 1],
		["grid", "column", 1],
		["grid", "dense", 1]
	]
};

// Degrees in an eighth turn, which is what an index into the tables below is.
const EIGHTH_TURN_DEGREES = 45;

/**
 * Cosine at each eighth turn, from sine: `cos(θ)` is `sin(θ + 90°)`, and 90° is
 * two eighths.
 * @returns {(number | null)[]} the eight values
 */
const collectEighthTurnCosine = () =>
	SUPPLEMENT.eighthTurnSine.map(
		(_, eighth) => SUPPLEMENT.eighthTurnSine[(eighth + 2) % 8]
	);

/**
 * One inverse trig function's answers, by inverting the table it inverts over
 * that function's principal branch — `asin` answers in [-90°, 90°], `acos` in
 * [0°, 180°], `atan` in (-90°, 90°). Only the eighth turns survive, which is
 * exactly where the answer is a whole number of degrees.
 * @param {(number | null)[]} table the forward table
 * @param {number} from the first eighth of the branch
 * @param {number} to the last eighth of the branch
 * @returns {[number, number][]} `[argument, degrees]`, by rising argument
 */
const collectArcAngles = (table, from, to) => {
	/** @type {[number, number][]} */
	const out = [];
	for (let eighth = from; eighth <= to; eighth++) {
		const value = table[((eighth % 8) + 8) % 8];
		if (value === null) continue;
		out.push([value, eighth * EIGHTH_TURN_DEGREES]);
	}
	return out.sort((a, b) => a[0] - b[0]);
};

// `readEighthTurn` is not a primitive of its own: it is the reader
// `eighthTurnReader` builds once the quarter-turn table exists.
const GENERATED_READERS = new Set(["readEighthTurn"]);

/**
 * Fail generation when a descriptor names an arithmetic that is not among the
 * ones emitted. The generated table holds the functions themselves, so an
 * unresolved name would otherwise reach `lib/css/data.js` as a bare identifier.
 */
const assertPrimitivesExist = () => {
	const defined = new Set(SUPPLEMENT.mathPrimitives.map(([name]) => name));
	for (const [name, read, apply] of SUPPLEMENT.mathFunctionFold) {
		for (const key of [read, apply]) {
			if (GENERATED_READERS.has(key) || defined.has(key)) continue;
			throw new Error(
				`${name}() names "${key}", which is not one of the emitted primitives`
			);
		}
	}
};

// The value classes `lib/css/syntax.js` sorts a printed component into. A slot
// naming any other one could claim a value the printer would not offer it, so
// the merge would read a value as unambiguous when it is not.
const PRINTER_VALUE_CLASSES = new Set([
	"color",
	"custom-ident",
	"ident",
	"image",
	"length",
	"percentage",
	"string",
	"url"
]);

/**
 * @param {Map<string, { classes: Set<string> }>} slots the family slots
 * @returns {void}
 */
const assertClassesArePrintable = (slots) => {
	for (const [name, { classes }] of slots) {
		for (const value of classes) {
			if (PRINTER_VALUE_CLASSES.has(value)) continue;
			throw new Error(
				`${name} accepts <${value}>, which the printer cannot classify`
			);
		}
	}
};

/**
 * Read every table out of the datasets and build the file they belong in.
 * Separate from writing it, so a test can assert the checked-in
 * `lib/css/data.js` is what this produces without touching the disk.
 * @returns {{ source: string, summary: string }} the unformatted file and what it holds
 */
const collectData = () => {
	assertGrammarsParse();
	assertPrimitivesExist();

	const boxShorthands = collectBoxShorthands(false);
	const slashShorthands = collectBoxShorthands(true);
	const boxLonghands = collectBoxLonghands([
		...boxShorthands,
		...slashShorthands
	]);
	const colorFunctions = collectColorArgumentFunctions();
	const colorNames = collectColorNames();
	const mathFunctions = collectMathFunctions();
	const substitutionFunctions = collectSubstitutionFunctions();
	const nthPseudoFunctions = collectNthPseudoFunctions();
	const selectorFunctions = collectSelectorFunctions();
	const colorOnlyProperties = collectColorOnlyProperties();
	const initialValueKeywords = collectInitialValueKeywords();
	const repeatStyleProperties = collectRepeatStyleProperties();
	const genericFontFamilies = collectGenericFontFamilies();
	const displayShortForms = collectDisplayShortForms();
	const backgroundPositionProperties = collectBackgroundPositionProperties();
	const shortenableColorNames = collectShortenableColorNames(colorNames);
	const zeroAngleFunctions = collectZeroAngleFunctions();
	const mathFunctionArity = collectMathFunctionArity(mathFunctions);
	const mathFunctionSumArguments = collectMathFunctionSumArguments(
		mathFunctions,
		mathFunctionArity
	);
	const integerProperties = collectIntegerProperties();
	const cssModulesKeywords = collectCssModulesKeywords();
	const negativeAcceptingProperties = collectNegativeAcceptingProperties();
	const pairLonghands = collectPairLonghands();
	const oneValuePairShorthands = collectOneValuePairShorthands(pairLonghands);
	const familyLonghands = collectFamilyLonghands();
	const slotAccepts = new Map();
	for (const [, longhands] of familyLonghands) {
		for (const longhand of longhands) {
			slotAccepts.set(
				longhand,
				acceptedValues(/** @type {string} */ (properties[longhand].syntax))
			);
		}
	}
	assertClassesArePrintable(slotAccepts);
	const colorKeywords = lowerSorted(
		acceptedValues(syntaxes.color.syntax).keywords
	);
	const lengthOnlyFunctions = collectLengthOnlyFunctions();
	const unitGroupBase = collectUnitGroupBase();
	const eighthTurnCosine = collectEighthTurnCosine();
	const steppedFunctions = SUPPLEMENT.mathFunctionFold
		.filter(([, , , , , stepped]) => stepped)
		.map(([name]) => name);

	const source = `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

// GENERATED by tooling/generate-css-data.js — do not edit.
// Sources: mdn-data ${mdnDataPackage.version}, color-name ${colorNamePackage.version}.

"use strict";

/** @typedef {(sums: Map<string, number>[]) => [string, number[]] | null} MathArgumentReader */
/** @typedef {(values: number[], strategy: string, table: Map<number, number> | null) => number | null} MathOperation */

// The arithmetic the math-function descriptors at the end of this file bind to.
// It knows nothing of CSS beyond the shape of an evaluated argument, and names
// no math function: which one uses which is the descriptors' business, and
// \`lib/css/syntax.js\` only drives the binding.
${SUPPLEMENT.mathPrimitives.map(([, body]) => body).join("\n\n")}

// Properties whose value is CSS's \`{1,4}\` box notation, where an omitted value
// is copied from the opposite side. That makes a repeated value redundant:
// \`margin:1px 1px 1px 1px\` is \`margin:1px\`. \`border-radius\` collapses each side
// of its \`/\` independently.
const BOX_SHORTHANDS = ${setLiteral([...boxShorthands, ...slashShorthands].sort())};

// The subset carrying a second box after a \`/\`, which collapses on its own.
const SLASH_BOX_SHORTHANDS = ${setLiteral(slashShorthands)};

// The four longhands each box shorthand sets, in the order \`{1,4}\` writes them:
// \`top right bottom left\`, or clockwise from the top left for a corner family.
// Only the families whose longhands are those four: merging those into the
// shorthand sets exactly the same properties, resetting nothing extra.
// prettier-ignore
const BOX_LONGHANDS = new Map([
${boxLonghands
	.map(
		([shorthand, longhands]) =>
			`\t["${shorthand}", [${longhands.map((l) => `"${l}"`).join(", ")}]]`
	)
	.join(",\n")}
]);

// The shorthands setting exactly two longhands, positionally — the same merge
// as the box families, two values wide. Only these: a shorthand gathering a
// whole family resets longhands \`computed\` does not name.
const PAIR_LONGHANDS = new Map([${pairLonghands
		.map(([name, longhands]) => `["${name}", ${JSON.stringify(longhands)}]`)
		.join(", ")}]);

// The subset whose two-value form is newer than the longhands, so only a merge
// collapsing to one value may emit it.
const ONE_VALUE_PAIR_SHORTHANDS = ${setLiteral(oneValuePairShorthands)};

// The shorthands written as an order-free \`||\` of their own longhands, each
// appearing once, in grammar order. A merge emits every value, so the only
// question is whether each parses back into the longhand it was authored on.
// prettier-ignore
const FAMILY_LONGHANDS = new Map([${familyLonghands
		.map(([name, longhands]) => `["${name}", ${JSON.stringify(longhands)}]`)
		.join(", ")}]);

// What each of those longhands accepts as a whole value: the keywords it names,
// and the value classes it reaches. A value acceptable to a second slot is what
// makes the merge ambiguous, and \`FAMILY_SLOT_CLASSES\` names a type the printer
// cannot classify as readily as one it can, so an unknown one declines.
// prettier-ignore
const FAMILY_SLOT_KEYWORDS = new Map([${[...slotAccepts]
		.map(
			([name, { keywords }]) =>
				`["${name}", ${JSON.stringify(lowerSorted(keywords))}]`
		)
		.join(", ")}]);

// prettier-ignore
const FAMILY_SLOT_CLASSES = new Map([${[...slotAccepts]
		.map(
			([name, { classes }]) =>
				`["${name}", ${JSON.stringify([...classes].sort())}]`
		)
		.join(", ")}]);

// The identifiers that are a \`<color>\` on their own — named, system and the two
// context-dependent ones. Read off the \`<color>\` grammar outside any function,
// so a channel keyword like the \`none\` in \`hsl(0 none 0)\` is not among them.
// cspell:ignore ${colorKeywords.join(" ")}
const COLOR_KEYWORDS = ${setLiteral(colorKeywords)};

// The name prefix a declaration between two box longhands must not carry for the
// merge to step over it. The shorthand's first segment, which is deliberately
// wider than the family: \`border-color\` blocks every \`border*\` property, since
// \`border\`, \`border-top\` and \`border-block-start-color\` all write its longhands
// and \`mdn-data\`'s \`computed\` lists only some of them.
const BOX_FAMILY_PREFIX = new Map([${boxLonghands
		.map(([shorthand]) => `["${shorthand}", "${shorthand.split("-")[0]}"]`)
		.join(", ")}]);

// Functions that take a \`<color>\` directly, so a hash among their arguments is a
// hex color rather than a case-sensitive reference (\`element(#id)\`). Only direct
// arguments: a gradient nested in \`image-set()\` is matched as the gradient.
const COLOR_ARGUMENT_FUNCTIONS = ${setLiteral(colorFunctions)};

// Functions that substitute an arbitrary token sequence, so two identical
// references need not be one repeated value: with \`--x:1px 2px\`,
// \`margin:var(--x) var(--x)\` is four values, not two.
const SUBSTITUTION_FUNCTIONS = ${setLiteral(substitutionFunctions)};

// The pseudo-class functions whose argument is An+B, where \`2n+1\` is the
// notation \`odd\` names in one byte less.
const NTH_PSEUDO_FUNCTIONS = ${setLiteral(nthPseudoFunctions)};

// The properties taking a color and never an identifier of the author's own, so
// a named color written in one is that color and may be spelled the shortest way.
const COLOR_ONLY_PROPERTIES = ${setLiteral(colorOnlyProperties)};

// Each two-keyword \`display\` -> the single keyword naming the same box.
const DISPLAY_SHORT_FORMS = new Map([
${displayShortForms
	.map(
		([pair, short]) => `\t[${JSON.stringify(pair)}, ${JSON.stringify(short)}]`
	)
	.join(",\n")}
]);

// The generic font families: an unquoted one of these names the generic rather
// than a family called that, so a quoted family spelled like one keeps its quotes.
const GENERIC_FONT_FAMILIES = ${setLiteral(genericFontFamilies)};

// The properties whose value is a \`<bg-position>\`, where \`center\` is the \`50%\`
// that axis defaults to.
const BACKGROUND_POSITION_PROPERTIES = ${setLiteral(backgroundPositionProperties)};

// The properties whose value is a \`<repeat-style>\`, where one value already
// says what two equal ones do.
const REPEAT_STYLE_PROPERTIES = ${setLiteral(repeatStyleProperties)};

// Each property whose initial value is a keyword shorter than \`initial\` -> that
// keyword, which is the same declaration written in fewer bytes.
const INITIAL_VALUE_KEYWORDS = new Map([
${initialValueKeywords
	.map(
		([name, initial]) =>
			`\t[${JSON.stringify(name)}, ${JSON.stringify(initial)}]`
	)
	.join(",\n")}
]);

// Each named color a shorter spelling beats -> that spelling, so a name written
// where a color is unambiguous prints as the shortest text for the same value.
const COLOR_NAME_TO_SHORTEST = new Map([
${shortenableColorNames
	.map(
		([name, shortest]) =>
			`\t[${JSON.stringify(name)}, ${JSON.stringify(shortest)}]`
	)
	.join(",\n")}
]);

// The functions whose argument is a selector, so a \`>\` / \`+\` / \`~\` inside one
// is a combinator and needs no whitespace around it.
const SELECTOR_FUNCTIONS = ${setLiteral(selectorFunctions)};

// The functions every argument of which is an angle, so a zero one needs no
// unit wherever it stands.
const ZERO_ANGLE_FUNCTIONS = ${setLiteral(zeroAngleFunctions)};

// CSS Values 4's math functions: everything inside one is a math expression, so
// \`*\` and \`/\` there are operators, and the whitespace around them carries nothing.
const MATH_FUNCTIONS = ${setLiteral(mathFunctions)};

// How many \`<calc-sum>\` arguments each of them takes, off its own grammar. A
// function whose arguments are not all expressions (\`round()\` leads with a
// strategy, \`calc-size()\` with a basis) is absent, and absence is what the
// folding reads as "leave this one alone".
/** @type {Map<string, [number, number]>} */
const MATH_FUNCTION_ARITY = new Map([${mathFunctionArity
		.map(([name, [min, max]]) => `["${name}", [${min}, ${max}]]`)
		.join(", ")}]);

// The optional keyword a math function may lead with, for the ones whose
// grammar offers a choice of them (\`round( <rounding-strategy>?, … )\`). Read
// off that production, so a strategy joining it needs no edit here.
/** @type {Map<string, string[]>} */
const MATH_FUNCTION_KEYWORDS = new Map([${mathFunctionArity
		.filter(([, , keywords]) => keywords.length !== 0)
		.map(
			([name, , keywords]) =>
				`["${name}", [${keywords.map((k) => `"${k}"`).join(", ")}]]`
		)
		.join(", ")}]);

// Where a function the fold cannot read as a whole still takes a \`<calc-sum>\`,
// so that argument reduces on its own. Keyed by name to the argument positions.
/** @type {Map<string, number[]>} */
const MATH_FUNCTION_SUM_ARGUMENTS = new Map([${mathFunctionSumArguments
		.map(([name, positions]) => `["${name}", [${positions.join(", ")}]]`)
		.join(", ")}]);

// A CSS-wide keyword is only valid as the whole value, so a box repeating one is
// invalid and already discarded — collapsing it would switch the declaration on.
const CSS_WIDE_KEYWORDS = ${setLiteral(SUPPLEMENT.cssWideKeywords)};

// \`<easing-function>\` argument lists that are exactly a shorter keyword, keyed
// by the arguments as \`Number\` prints them.
const CUBIC_BEZIER_KEYWORDS = ${mapLiteral(SUPPLEMENT.cubicBezierKeywords)};

// The two \`flex\` values CSS Flexbox 7.1.1 gives a keyword spelling.
const FLEX_KEYWORDS = ${mapLiteral(SUPPLEMENT.flexKeywords)};

// The \`font-weight\` keywords CSS Fonts 4 §2.2 defines as a number, which is what
// \`getComputedStyle().fontWeight\` reports either way.
const FONT_WEIGHT_NUMBERS = ${mapLiteral(SUPPLEMENT.fontWeightNumbers)};

// Selectors 4 §3.3: the pseudo-elements engines must also accept with one colon,
// so their second colon carries nothing.
const LEGACY_PSEUDO_ELEMENTS = ${setLiteral(SUPPLEMENT.legacyPseudoElements)};

// What may follow the \`*\` a compound selector implies: another simple selector
// in the same compound. A separator between them would be a descendant
// combinator instead, and \`|\` makes the \`*\` a namespace's, not a redundant one.
const COMPOUND_CONTINUATIONS = ${setLiteral(SUPPLEMENT.compoundContinuations)};

// The properties whose zero length keeps its unit — the one place it is still
// load-bearing.
const ZERO_UNIT_KEEPING_PROPERTIES = ${setLiteral(SUPPLEMENT.zeroUnitKeepingProperties)};

// At-rules whose empty block is inert, so dropping it changes nothing.
const DROPPABLE_WHEN_EMPTY_AT_RULES = ${setLiteral(SUPPLEMENT.droppableWhenEmptyAtRules)};

// The math functions whose result steps with their arguments, so a value inside
// one keeps the unit and the digits it was written with.
const STEPPED_FUNCTIONS = ${setLiteral(steppedFunctions)};

// The units fixed against each other (CSS Values 4 §6.2, §8), as
// \`unit -> [group, how many of the group's base unit one is]\`. Two units in the
// same group convert into each other exactly when the ratio is binary-exact.
/** @type {Map<string, [string, number]>} */
const ABSOLUTE_UNIT_SCALE = new Map([${SUPPLEMENT.absoluteUnitScale
		.map(([unit, group, scale]) => `["${unit}", ["${group}", ${scale}]]`)
		.join(", ")}]);

// Each convertible group's reference unit, as \`group -> [unit, scale]\`. A sum
// counted in the group's base unit divides by the scale to get back to a unit
// that can be written down.
/** @type {Map<string, [string, number]>} */
const UNIT_GROUP_BASE = new Map([${unitGroupBase
		.map(([group, [unit, scale]]) => `["${group}", ["${unit}", ${scale}]]`)
		.join(", ")}]);

// The units a conversion may emit. Every one is CSS 2.1's, so rewriting into it
// cannot outrun what an engine reading the stylesheet already parses.
const UNIT_CONVERSION_TARGETS = ${setLiteral(SUPPLEMENT.unitConversionTargets)};

// The angle units. Excluded from rounding: \`rotate()\` runs its argument through
// trig, which turns a truncated digit into a different computed matrix.
const ANGLE_UNITS = ${setLiteral(SUPPLEMENT.angleUnits)};

// A quarter turn in each unit that spells it exactly (CSS Values 4 §8.1), as
// \`unit -> the count\`. The trig functions are folded only where their argument
// is a whole number of these, which is where sine and cosine are rational.
/** @type {Map<string, number>} */
const QUARTER_TURN_ANGLE = new Map([${SUPPLEMENT.quarterTurnAngle
		.map(([unit, count]) => `["${unit}", ${count}]`)
		.join(", ")}]);

// Sine, cosine and tangent as \`eighth turn from zero -> value\`. The eighths
// where the value is irrational are absent — sine and cosine on the odd ones,
// tangent on the asymptotes. Cosine is sine a quarter turn along.
/** @type {Map<number, number>} */
const EIGHTH_TURN_SINE = ${numberMapLiteral(eighthTurnEntries(SUPPLEMENT.eighthTurnSine))};

/** @type {Map<number, number>} */
const EIGHTH_TURN_COSINE = ${numberMapLiteral(eighthTurnEntries(eighthTurnCosine))};

/** @type {Map<number, number>} */
const EIGHTH_TURN_TANGENT = ${numberMapLiteral(eighthTurnEntries(SUPPLEMENT.eighthTurnTangent))};

// What each inverse trig function answers, as \`argument -> degrees\`, by
// inverting the table above it over that function's principal branch. Every
// other argument is transcendental and leaves the call written out.
/** @type {Map<number, number>} */
const ARC_SINE_DEGREES = ${numberMapLiteral(collectArcAngles(SUPPLEMENT.eighthTurnSine, -2, 2))};

/** @type {Map<number, number>} */
const ARC_COSINE_DEGREES = ${numberMapLiteral(collectArcAngles(eighthTurnCosine, 0, 4))};

/** @type {Map<number, number>} */
const ARC_TANGENT_DEGREES = ${numberMapLiteral(collectArcAngles(SUPPLEMENT.eighthTurnTangent, -1, 1))};

// The reader that needs a table, built once here — \`mathPrimitives\` knows the
// arithmetic of an eighth turn but not which units spell one.
const readEighthTurn = eighthTurnReader(QUARTER_TURN_ANGLE);

// What folding each math function comes down to, as
// \`name -> { read, apply, result, table }\`: how its arguments are read, which
// arithmetic runs, and the unit the answer carries. \`read\` and \`apply\` are the
// functions themselves, so \`lib/css/syntax.js\` drives the fold while naming
// neither a math function nor an arithmetic of its own.
/** @type {Map<string, { read: MathArgumentReader, apply: MathOperation, result: string, table: Map<number, number> | null }>} */
const MATH_FUNCTION_FOLD = new Map([
${SUPPLEMENT.mathFunctionFold
	.map(
		([name, read, apply, result, table]) =>
			`\t["${name}", { read: ${read}, apply: ${apply}, result: "${result}", table: ${table === null ? "null" : table} }]`
	)
	.join(",\n")}
]);

// Properties whose grammar can reach an \`<integer>\`. Deliberately wide: a
// non-integer where an integer is expected is rounded rather than dropped
// (\`z-index: calc(1.5)\` computes to \`2\`), so this is read to refuse a rewrite,
// and one name too many costs only that rewrite.
const INTEGER_PROPERTIES = ${setLiteral(integerProperties)};

// The keywords of every property a \`css/module\` reads a scoped name out of,
// each mapped to how many times it may be spelled before the next one is the
// name (\`Infinity\` — never the name). Derived from each property's grammar.
const CSS_MODULES_KEYWORDS = new Map([
${cssModulesKeywords
	.map(
		([name, , table]) =>
			`\t["${name}", new Map([${table
				.map(([keyword, count]) => `["${keyword}", ${count}]`)
				.join(", ")}])]`
	)
	.join(",\n")}
]);

// The parser option gating each of them.
const CSS_MODULES_KEYWORD_OPTIONS = ${mapLiteral(cssModulesKeywords.map(([name, option]) => [name, option]))};

// The properties a negative value is valid on, so \`calc(-5px)\` may lose its
// parentheses there. Read to permit a rewrite, which is the opposite of
// \`INTEGER_PROPERTIES\` above: naming one property too many is a bug, naming one
// too few only costs a rewrite.
const NEGATIVE_ACCEPTING_PROPERTIES = ${setLiteral(negativeAcceptingProperties)};

// The functions whose every numeric argument is a length, so a zero inside one
// drops its unit the way a whole component's does. Read to permit a rewrite:
// any other numeric type would make the bare \`0\` mean something else, or make
// a dropped declaration valid.
const LENGTH_ONLY_FUNCTIONS = ${setLiteral(lengthOnlyFunctions)};

// Packed \`0xrrggbb\` -> the shortest named color with that value. Only names that
// can beat \`#rrggbb\`; anything longer would never be picked.
const RGB_TO_NAME = new Map([
${colorNames
	.map(
		([packed, name]) =>
			`\t[0x${packed.toString(16).padStart(6, "0")}, "${name}"]`
	)
	.join(",\n")}
]);

module.exports.ABSOLUTE_UNIT_SCALE = ABSOLUTE_UNIT_SCALE;
module.exports.ANGLE_UNITS = ANGLE_UNITS;
module.exports.ARC_COSINE_DEGREES = ARC_COSINE_DEGREES;
module.exports.ARC_SINE_DEGREES = ARC_SINE_DEGREES;
module.exports.ARC_TANGENT_DEGREES = ARC_TANGENT_DEGREES;
module.exports.BOX_FAMILY_PREFIX = BOX_FAMILY_PREFIX;
module.exports.BOX_LONGHANDS = BOX_LONGHANDS;
module.exports.BACKGROUND_POSITION_PROPERTIES = BACKGROUND_POSITION_PROPERTIES;\nmodule.exports.BOX_SHORTHANDS = BOX_SHORTHANDS;
module.exports.COLOR_ARGUMENT_FUNCTIONS = COLOR_ARGUMENT_FUNCTIONS;\nmodule.exports.COLOR_NAME_TO_SHORTEST = COLOR_NAME_TO_SHORTEST;\nmodule.exports.COLOR_ONLY_PROPERTIES = COLOR_ONLY_PROPERTIES;
module.exports.COLOR_KEYWORDS = COLOR_KEYWORDS;
module.exports.COMPOUND_CONTINUATIONS = COMPOUND_CONTINUATIONS;
module.exports.CSS_MODULES_KEYWORDS = CSS_MODULES_KEYWORDS;
module.exports.CSS_MODULES_KEYWORD_OPTIONS = CSS_MODULES_KEYWORD_OPTIONS;
module.exports.CSS_WIDE_KEYWORDS = CSS_WIDE_KEYWORDS;
module.exports.CUBIC_BEZIER_KEYWORDS = CUBIC_BEZIER_KEYWORDS;
module.exports.DISPLAY_SHORT_FORMS = DISPLAY_SHORT_FORMS;\nmodule.exports.DROPPABLE_WHEN_EMPTY_AT_RULES = DROPPABLE_WHEN_EMPTY_AT_RULES;
module.exports.EIGHTH_TURN_COSINE = EIGHTH_TURN_COSINE;
module.exports.EIGHTH_TURN_SINE = EIGHTH_TURN_SINE;
module.exports.EIGHTH_TURN_TANGENT = EIGHTH_TURN_TANGENT;
module.exports.FAMILY_LONGHANDS = FAMILY_LONGHANDS;
module.exports.FAMILY_SLOT_CLASSES = FAMILY_SLOT_CLASSES;
module.exports.FAMILY_SLOT_KEYWORDS = FAMILY_SLOT_KEYWORDS;
module.exports.FLEX_KEYWORDS = FLEX_KEYWORDS;
module.exports.FONT_WEIGHT_NUMBERS = FONT_WEIGHT_NUMBERS;
module.exports.GENERIC_FONT_FAMILIES = GENERIC_FONT_FAMILIES;\nmodule.exports.INITIAL_VALUE_KEYWORDS = INITIAL_VALUE_KEYWORDS;\nmodule.exports.INTEGER_PROPERTIES = INTEGER_PROPERTIES;
module.exports.LEGACY_PSEUDO_ELEMENTS = LEGACY_PSEUDO_ELEMENTS;
module.exports.LENGTH_ONLY_FUNCTIONS = LENGTH_ONLY_FUNCTIONS;
module.exports.MATH_FUNCTIONS = MATH_FUNCTIONS;
module.exports.MATH_FUNCTION_ARITY = MATH_FUNCTION_ARITY;
module.exports.MATH_FUNCTION_FOLD = MATH_FUNCTION_FOLD;
module.exports.MATH_FUNCTION_KEYWORDS = MATH_FUNCTION_KEYWORDS;
module.exports.MATH_FUNCTION_SUM_ARGUMENTS = MATH_FUNCTION_SUM_ARGUMENTS;
module.exports.NEGATIVE_ACCEPTING_PROPERTIES = NEGATIVE_ACCEPTING_PROPERTIES;
module.exports.NTH_PSEUDO_FUNCTIONS = NTH_PSEUDO_FUNCTIONS;
module.exports.ONE_VALUE_PAIR_SHORTHANDS = ONE_VALUE_PAIR_SHORTHANDS;
module.exports.PAIR_LONGHANDS = PAIR_LONGHANDS;
module.exports.QUARTER_TURN_ANGLE = QUARTER_TURN_ANGLE;
module.exports.REPEAT_STYLE_PROPERTIES = REPEAT_STYLE_PROPERTIES;\nmodule.exports.RGB_TO_NAME = RGB_TO_NAME;
module.exports.SELECTOR_FUNCTIONS = SELECTOR_FUNCTIONS;\nmodule.exports.SLASH_BOX_SHORTHANDS = SLASH_BOX_SHORTHANDS;
module.exports.STEPPED_FUNCTIONS = STEPPED_FUNCTIONS;
module.exports.SUBSTITUTION_FUNCTIONS = SUBSTITUTION_FUNCTIONS;
module.exports.UNIT_CONVERSION_TARGETS = UNIT_CONVERSION_TARGETS;
module.exports.UNIT_GROUP_BASE = UNIT_GROUP_BASE;
module.exports.ZERO_ANGLE_FUNCTIONS = ZERO_ANGLE_FUNCTIONS;
module.exports.ZERO_UNIT_KEEPING_PROPERTIES = ZERO_UNIT_KEEPING_PROPERTIES;\n// The exact arithmetic the printer's own evaluator needs. Sorted after the\n// tables: \`import/order\` orders exports by case, uppercase first.\nmodule.exports.exactAdd = exactAdd;\nmodule.exports.exactDivide = exactDivide;\nmodule.exports.exactMultiply = exactMultiply;
`;

	const summary = `${boxShorthands.length + slashShorthands.length} box shorthands (${slashShorthands.length} with a \`/\`), ${colorFunctions.length} color functions, ${substitutionFunctions.length} substitution functions, ${colorNames.length} color names, ${integerProperties.length} integer properties, ${negativeAcceptingProperties.length} negative-accepting properties, ${lengthOnlyFunctions.length} length-only functions, ${pairLonghands.length} pair shorthands, ${mathFunctionArity.length} of ${mathFunctions.length} math functions with a readable arity, ${cssModulesKeywords.length} css modules scoped properties (${cssModulesKeywords.reduce((total, [, , table]) => total + table.length, 0)} keywords)`;
	return { source, summary };
};

/**
 * Write `lib/css/data.js`, or report that it is out of date.
 */
const generate = () => {
	// Required here, not at the top: `collectData` is imported by a test that runs
	// on Bun and Deno, where prettier's dynamic import fails under jest's `vm`.
	const prettier = require("prettier");

	const { source, summary } = collectData();
	// Formatted here rather than left to `yarn fmt`, so the comparison below is
	// against what the repo actually checks in.
	prettier
		.resolveConfig(TARGET)
		.then((config) => prettier.format(source, { ...config, filepath: TARGET }))
		.then((formatted) => {
			const current = fs.existsSync(TARGET)
				? fs.readFileSync(TARGET, "utf8")
				: "";
			if (current === formatted) {
				process.stdout.write(`lib/css/data.js is up to date (${summary})\n`);
			} else if (write) {
				fs.writeFileSync(TARGET, formatted);
				process.stdout.write(`lib/css/data.js updated (${summary})\n`);
			} else {
				process.stderr.write(
					"lib/css/data.js is out of date — run `yarn fix:special`\n"
				);
				process.exitCode = 1;
			}
		});
};

if (require.main === module) generate();

module.exports.DATA_TARGET = TARGET;
module.exports.acceptedValues = acceptedValues;
module.exports.assertClassesArePrintable = assertClassesArePrintable;
module.exports.collectData = collectData;
module.exports.parseValueSyntax = parseValueSyntax;
module.exports.walkValueSyntax = walkValueSyntax;
