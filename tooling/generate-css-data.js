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
const bcd =
	/** @type {{ css: { properties: { [name: string]: BcdNode }, selectors: { [name: string]: BcdNode }, "at-rules": { [name: string]: BcdNode }, types: { [name: string]: BcdNode } }, __meta: { version: string } }} */ (
		/** @type {unknown} */ (require("@mdn/browser-compat-data"))
	);

/** @typedef {{ version: string }} PackageManifest */
/** @typedef {{ [name: string]: [number, number, number] }} ColorNameTable */
/** @typedef {{ [name: string]: { syntax: string } }} SyntaxTable */
/** @typedef {{ [name: string]: { syntax?: string } }} PartialSyntaxTable */
/** @typedef {{ [name: string]: { syntax?: string, status?: string, computed?: string | string[], initial?: string | string[] } }} PartialPropertyTable */
/** @typedef {{ [name: string]: { syntax?: string, status?: string } }} PartialSelectorTable */
/** @typedef {{ version_added?: string | boolean | null, version_removed?: string | boolean | null, prefix?: string, alternative_name?: string, partial_implementation?: boolean, flags?: EXPECTED_ANY[] }} BcdSupport */
/** @typedef {{ support: { [browser: string]: BcdSupport | BcdSupport[] } }} BcdCompat */
/** @typedef {{ __compat?: BcdCompat }} BcdNode */
const bcdVersion = bcd.__meta.version;

/** @type {PackageManifest} */
const colorNamePackage = require("color-name/package.json");
/** @type {PartialSyntaxTable} */
const atRules = require("mdn-data/css/at-rules.json");
/** @type {SyntaxTable} */
const functions = require("mdn-data/css/functions.json");
/** @type {PartialPropertyTable} */
const properties = require("mdn-data/css/properties.json");
const selectors = require("mdn-data/css/selectors.json");
/** @type {SyntaxTable} */
const syntaxes = require("mdn-data/css/syntaxes.json");
const units = require("mdn-data/css/units.json");
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

// A few entries write the bounds outside the type (`<length> [0,∞]`), meaning
// what `<length [0,∞]>` does; no group is ever a bare pair of bounds.
const OUTSIDE_RANGE =
	/^\s*\[\s*(-?(?:\d*\.?\d+[a-z%]*|∞))\s*,\s*(-?(?:\d*\.?\d+[a-z%]*|∞))\s*\]/;

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
	 * `<length>`, `<length [0,∞]>`, `<length> [0,∞]`, `<'margin-top'>`.
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
			const outside = OUTSIDE_RANGE.exec(this.source.slice(this.pos));
			if (outside === null) {
				return { type: "type", name: inner, min: null, max: null };
			}
			this.pos += outside[0].length;
			return {
				type: "type",
				name: inner,
				min: parseBound(outside[1]),
				max: parseBound(outside[2])
			};
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
	return out
		.filter(([, longhands]) => claims.get(longhands.join(" ")) === 1)
		.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The properties whose comma-separated items take a `<custom-ident>`, so any
 * vendor spelling parses: a comma multiplier whose body reaches one.
 * @returns {string[]} the property names, sorted
 */
const collectCustomIdentListProperties = () => {
	/**
	 * Whether an item may be written as a bare `<custom-ident>`. Its own walk
	 * rather than `walkValueSyntax`: a `<custom-ident>` inside a function's
	 * arguments is that function's, not a name the item itself may be spelled as,
	 * and reading it as one would let a `-webkit-` *function* pass for a name.
	 * @param {EXPECTED_ANY} node a value-syntax node
	 * @param {Set<string>} seen the references already followed
	 * @returns {boolean} whether the item itself may be a `<custom-ident>`
	 */
	const reachesCustomIdent = (node, seen) => {
		switch (node.type) {
			case "type": {
				if (node.name === "custom-ident" || node.name === "dashed-ident") {
					return true;
				}
				const referenced = syntaxes[node.name];
				if (referenced === undefined || seen.has(node.name)) return false;
				seen.add(node.name);
				return reachesCustomIdent(grammarOf(referenced.syntax), seen);
			}
			case "oneOf":
			case "anyOf":
			case "allOf":
			case "sequence":
				return node.items.some(
					/** @type {(item: EXPECTED_ANY) => boolean} */
					((item) => reachesCustomIdent(item, seen))
				);
			case "group":
			case "parens":
			case "multiplier":
				return reachesCustomIdent(node.body, seen);
			// A function's arguments are its own, and a property reference reaches
			// whatever that property does — neither is this item's name slot.
			default:
				return false;
		}
	};
	/** @type {string[]} */
	const out = [];
	for (const [name, property] of Object.entries(properties)) {
		if (property.status !== "standard") continue;
		if (typeof property.syntax !== "string") continue;
		const tree = grammarOf(property.syntax);
		let listed = false;
		walkValueSyntax(tree, (node) => {
			if (listed) return;
			if (node.type !== "multiplier" || node.comma !== true) return;
			if (reachesCustomIdent(node.body, new Set())) listed = true;
		});
		if (listed) out.push(name);
	}
	return out.sort();
};

/**
 * The shorthands that set their longhands positionally with a `/` between them:
 * `<X> [ / <X> ]{0,n}` over the `n + 1` names `computed` lists, in that order.
 * An omitted slot copies the first only when that is a `<custom-ident>`, else
 * takes `auto` — so dropping one is right for an ident and wrong for anything else.
 * @returns {[string, string[]][]} `[shorthand, longhands]`, sorted
 */
const collectSlashLonghands = () => {
	/** @type {[string, string[]][]} */
	const out = [];
	for (const [name, property] of Object.entries(properties)) {
		if (property.status !== "standard") continue;
		if (typeof property.syntax !== "string") continue;
		const longhands = property.computed;
		if (!Array.isArray(longhands) || longhands.length < 2) continue;
		const tree = grammarOf(property.syntax);
		if (tree.type !== "sequence" || tree.items.length !== 2) continue;
		const [first, rest] = tree.items;
		if (first.type !== "type" || rest.type !== "multiplier") continue;
		if (rest.comma || rest.min !== 0) continue;
		if (rest.max !== longhands.length - 1) continue;
		const body = rest.body.type === "group" ? rest.body.body : rest.body;
		if (body.type !== "sequence" || body.items.length !== 2) continue;
		const [slash, repeated] = body.items;
		if (slash.type !== "literal" || slash.value !== "/") continue;
		// The same production on both sides, so every slot takes the same values
		// and the order `computed` states is the order they are written in.
		if (repeated.type !== "type" || repeated.name !== first.name) continue;
		out.push([name, longhands]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
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

/**
 * A dataset entry's value definition, or null where it states none.
 * @param {EXPECTED_ANY} entry a `properties` or `syntaxes` entry
 * @returns {string | null} its grammar
 */
const grammarText = (entry) =>
	entry !== undefined && typeof entry.syntax === "string" ? entry.syntax : null;

/**
 * The keywords a shorthand's longhands disagree on — one accepts it, another does
 * not — so writing the value into every slot at once turns a declaration the
 * engine kept into a shorthand it drops whole. `justify-items` takes `left` and
 * `align-items` does not, which is what makes `place-items:left` unreadable.
 * Read off the two grammars, keyword by keyword.
 * @param {[string, string[]][][]} tables the shorthand-to-longhands tables to read
 * @returns {[string, string[]][]} `[shorthand, keywords]`, sorted, empty ones out
 */
const collectUnsharedLonghandKeywords = (tables) => {
	/**
	 * Every bare keyword a grammar accepts, references followed.
	 * @param {string} name a property
	 * @returns {Set<string> | null} its keywords, or null when it has no grammar
	 */
	const keywordsOf = (name) => {
		const own = grammarText(properties[name]);
		if (own === null) return null;
		/** @type {Set<string>} */
		const out = new Set();
		/**
		 * @param {EXPECTED_ANY} node a value-syntax node
		 * @param {Set<string>} seen the references already followed
		 * @returns {void}
		 */
		const collect = (node, seen) => {
			if (node.type === "keyword") {
				out.add(node.name.toLowerCase());
				return;
			}
			// `<'border-top-color'>` is a `property` node: how one longhand of a
			// family states that it takes whatever another of them does.
			if (node.type === "type" || node.type === "property") {
				const referenced = grammarText(
					node.type === "property" ? properties[node.name] : syntaxes[node.name]
				);
				if (referenced === null || seen.has(node.name)) return;
				seen.add(node.name);
				collect(parseValueSyntax(referenced), seen);
				return;
			}
			switch (node.type) {
				case "oneOf":
				case "anyOf":
				case "allOf":
				case "sequence":
					for (const item of node.items) collect(item, seen);
					break;
				case "group":
				case "parens":
				case "multiplier":
					collect(node.body, seen);
					break;
				case "function":
					if (node.body !== null) collect(node.body, seen);
					break;
				default:
					break;
			}
		};
		collect(parseValueSyntax(own), new Set());
		return out;
	};
	/** @type {[string, string[]][]} */
	const out = [];
	for (const table of tables) {
		for (const [shorthand, longhands] of table) {
			const sets = longhands.map(keywordsOf);
			if (sets.includes(null)) continue;
			/** @type {Set<string>} */
			const unshared = new Set();
			for (const set of /** @type {Set<string>[]} */ (sets)) {
				for (const keyword of set) {
					if (
						sets.some(
							(other) => !(/** @type {Set<string>} */ (other).has(keyword))
						)
					) {
						unshared.add(keyword);
					}
				}
			}
			if (unshared.size !== 0) out.push([shorthand, [...unshared].sort()]);
		}
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
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
 * The spellings stated for a class no dataset writes out, or `null`.
 * @param {string} name the class name
 * @returns {string[] | null} the spellings, or `null` if none are stated
 */
const statedClassSpellings = (name) => {
	for (const [one, spellings] of SUPPLEMENT.classSpellings) {
		if (one === name) return spellings;
	}
	return null;
};

/**
 * Whether a value definition offers only values a printed component is looked
 * up by — a keyword, or a call named by its function. A class it reaches counts
 * when it is spelled out in turn: `<image>` is (a `<url>`, or a gradient call),
 * `<color>` is not (`#fff` is neither).
 * @param {string} source the value-definition syntax
 * @param {Set<string>} seen the class names already on this walk
 * @returns {boolean} whether every value of it is spelled
 */
const isSpelledSyntax = (source, seen) => {
	let tree;
	try {
		tree = parseValueSyntax(source);
	} catch (_err) {
		return false;
	}
	let spelled = true;
	/**
	 * @param {EXPECTED_ANY} node the node to walk
	 * @returns {void}
	 */
	const walk = (node) => {
		if (!spelled) return;
		// A call's arguments are its own; the component is spelled by its name.
		if (node.type === "keyword" || node.type === "function") return;
		if (node.type === "type") {
			if (seen.has(node.name)) return;
			seen.add(node.name);
			if (statedClassSpellings(node.name) !== null) return;
			const entry = syntaxes[node.name];
			if (entry === undefined || !isSpelledSyntax(entry.syntax, seen)) {
				spelled = false;
			}
			return;
		}
		if (node.type === "property") {
			spelled = false;
			return;
		}
		if (node.items) for (const item of node.items) walk(item);
		else if (node.body) walk(node.body);
	};
	walk(tree);
	return spelled;
};

/**
 * Whether every value of a class is one `slotSpellings` reports.
 * @param {string} name the class name
 * @returns {boolean} whether it is spelled out
 */
const isSpelledClass = (name) => {
	if (statedClassSpellings(name) !== null) return true;
	const entry = syntaxes[name];
	return entry !== undefined && isSpelledSyntax(entry.syntax, new Set([name]));
};

/**
 * A stated class is stated because no dataset writes it out; once one does, the
 * derived spelling is the one to read.
 * @param {SyntaxTable} syntaxTable the `syntaxes.json` to read
 * @returns {void}
 */
const checkStatedClassSpellings = (syntaxTable) => {
	for (const [name] of SUPPLEMENT.classSpellings) {
		if (syntaxTable[name] !== undefined) {
			throw new Error(`\`<${name}>\` is spelled out by mdn-data now`);
		}
	}
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
 * The one type a longhand's whole value is, followed through the `<'other'>`
 * some longhands are stated as.
 * @param {string} name the property name
 * @param {number} depth the references followed so far
 * @param {PartialPropertyTable} propertyTable the `properties.json` to read
 * @returns {string | null} the type's name, or `null` when it is not one type
 */
const longhandType = (name, depth, propertyTable = properties) => {
	const entry = propertyTable[name];
	if (entry === undefined || typeof entry.syntax !== "string" || depth > 4) {
		return null;
	}
	const syntax = entry.syntax.trim();
	const referenced = /^<'([a-z-]+)'>$/.exec(syntax);
	if (referenced !== null) {
		return longhandType(referenced[1], depth + 1, propertyTable);
	}
	const type = /^<([a-z-]+)>$/.exec(syntax);
	return type === null ? null : type[1];
};

/**
 * The shorthands written as an order-free `||` of their own longhands, each
 * appearing once: `outline`, `text-decoration`, … Merging those emits every
 * value in grammar order, which `||` accepts in any order, so the only question
 * is whether each value parses back into the longhand it was authored on — the
 * per-slot tables below are what answers it.
 * @param {PartialPropertyTable} propertyTable the `properties.json` to read
 * @param {string[]} verifiedShorthands the shorthands a merge may emit
 * @returns {[string, string[]][]} `[shorthand, longhands]` in grammar order
 */
const collectFamilyLonghands = (
	propertyTable = properties,
	verifiedShorthands = SUPPLEMENT.familyShorthands
) => {
	const verified = new Set(verifiedShorthands);
	/** @type {[string, string[]][]} */
	const out = [];
	for (const [name, property] of Object.entries(propertyTable)) {
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
		// A logical family states its grammar as its physical twin's whole value
		// (`border-inline-start` is `<'border-top'>`), so the slots are read off that
		// one and mapped back by position — both list width, style then color.
		let twin = null;
		if (tree.type === "property") {
			const other = propertyTable[tree.name];
			if (other === undefined || typeof other.syntax !== "string") continue;
			if (!Array.isArray(other.computed)) continue;
			try {
				tree = parseValueSyntax(other.syntax);
			} catch (_err) {
				continue;
			}
			twin = other.computed;
		}
		if (tree.type !== "anyOf") continue;
		const named = twin === null ? longhands : twin;
		if (named.length !== longhands.length) continue;
		const slots = tree.items.map((item) => {
			if (item.type === "property") return item.name;
			if (item.type !== "type") return null;
			// A grammar naming its slots by type: the slot is the one longhand
			// whose whole value is that type, through any `<'other'>`.
			const byType = named.filter(
				(one) => longhandType(one, 0, propertyTable) === item.name
			);
			return byType.length === 1 ? byType[0] : null;
		});
		if (slots.includes(null)) continue;
		if (slots.length !== named.length) continue;
		if (slots.some((slot) => !named.includes(/** @type {string} */ (slot)))) {
			continue;
		}
		out.push([
			name,
			twin === null
				? /** @type {string[]} */ (slots)
				: slots.map(
						(slot) => longhands[named.indexOf(/** @type {string} */ (slot))]
					)
		]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The shorthands a merge writes by position (see `SUPPLEMENT.orderedShorthands`),
 * with their longhands in the order the grammar juxtaposes them — which is the
 * order `mdn-data` lists them in.
 * @param {string[]} shorthands the ordered-shorthand property names
 * @returns {[string, string[]][]} `[shorthand, longhands]`, sorted
 */
const collectOrderedLonghands = (shorthands) => {
	/** @type {[string, string[]][]} */
	const out = [];
	for (const name of shorthands) {
		const longhands = properties[name].computed;
		if (!Array.isArray(longhands) || longhands.length < 2) continue;
		out.push([name, longhands]);
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
		/**
		 * @param {string} part side or corner name
		 * @returns {string | undefined} the longhand naming that part, if any
		 */
		const match = (part) =>
			longhands.find(
				(longhand) =>
					longhand === part ||
					longhand.includes(`-${part}-`) ||
					longhand.endsWith(`-${part}`)
			);
		/**
		 * A corner name holds two side names (`border-top-left-radius` answers both
		 * `top` and `left`), so a sides match only counts when it is one-to-one.
		 * @param {(string | undefined)[]} found longhands matched per side/corner
		 * @returns {boolean} true when every side matched a distinct longhand
		 */
		const distinct = (found) =>
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
				`${label} does not parse: ${
					/** @type {Error} */ (err).message
				}\n  ${syntax}`,
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
 * The numeric types a value may itself be, following `<production>` and
 * `<'property'>` references but stopping at a function — a `<number>` inside
 * `rgb()` or a gradient is that function's argument, not something the value
 * could have been written as.
 * @param {string} syntax a value definition
 * @param {PartialSyntaxTable} propertyTable where a `<'property'>` is read
 * @returns {Set<string>} the numeric type names reachable at the value's level
 */
const valueLevelNumericTypes = (syntax, propertyTable = properties) => {
	/** @type {Set<string>} */
	const found = new Set();
	/** @type {Set<string>} */
	const seen = new Set();
	/**
	 * @param {SyntaxNode} node the node to read
	 * @returns {void}
	 */
	const walk = (node) => {
		switch (node.type) {
			case "oneOf":
			case "anyOf":
			case "allOf":
			case "sequence":
				for (const item of node.items) walk(item);
				return;
			case "group":
			case "parens":
			case "multiplier":
				walk(node.body);
				return;
			// Deliberately not entered: what a function takes is not what the
			// property takes.
			case "function":
				return;
			case "property": {
				const nested = propertyTable[node.name];
				if (
					nested !== undefined &&
					typeof nested.syntax === "string" &&
					!seen.has(`'${node.name}`)
				) {
					seen.add(`'${node.name}`);
					walk(grammarOf(nested.syntax));
				}
				return;
			}
			case "type": {
				if (NUMERIC_TYPES.has(node.name)) {
					found.add(node.name);
					return;
				}
				if (node.name === "length-percentage") {
					found.add("length");
					found.add("percentage");
					return;
				}
				const nested = definitions.get(node.name);
				if (nested !== undefined && !seen.has(node.name)) {
					seen.add(node.name);
					walk(grammarOf(nested));
				}
				break;
			}
			default:
				break;
		}
	};
	walk(grammarOf(syntax));
	return found;
};

/**
 * The properties whose grammar offers a `<number>` beside the `<length>`, so a
 * zero losing its unit binds to the other reading (`tab-size:0` is characters).
 * @param {PartialSyntaxTable} propertyTable the `properties.json` to read
 * @returns {string[]} the property names, sorted
 */
const collectZeroUnitAmbiguousProperties = (propertyTable = properties) => {
	const out = [];
	for (const [name, entry] of Object.entries(propertyTable)) {
		if (typeof entry.syntax !== "string") continue;
		const kinds = valueLevelNumericTypes(entry.syntax, propertyTable);
		// `<integer>` spells the same token an `<integer>`-only grammar takes, so
		// `tab-size:0` binds to it exactly as `line-height:0` binds to `<number>`.
		if (kinds.has("length") && (kinds.has("number") || kinds.has("integer"))) {
			out.push(name);
		}
	}
	return out.sort();
};

/**
 * The properties whose whole value is `<number> | <percentage>` reading the two
 * as one quantity, a percentage being the number hundredfold. Only the whole
 * value: a percentage beside a length means something else again.
 * @param {PartialSyntaxTable} propertyTable the `properties.json` to read
 * @param {SyntaxTable} syntaxTable the `syntaxes.json` to follow names through
 * @returns {string[]} the property names, sorted
 */
const collectAlphaValueProperties = (
	propertyTable = properties,
	syntaxTable = syntaxes
) => {
	const out = [];
	for (const [name, entry] of Object.entries(propertyTable)) {
		let syntax = entry.syntax;
		const seen = new Set();
		// Named through a production of its own (`<alpha-value>`), so follow those
		// to whatever states the alternation.
		while (typeof syntax === "string") {
			const named = /^<([a-z-]+)>$/.exec(syntax.trim());
			if (named === null || seen.has(named[1])) break;
			seen.add(named[1]);
			const nested = syntaxTable[named[1]];
			if (nested === undefined) break;
			syntax = nested.syntax;
		}
		if (typeof syntax !== "string") continue;
		if (/^<number>\s*\|\s*<percentage>$/.test(syntax.trim())) out.push(name);
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

/**
 * The properties whose grammar reaches a `<ratio>`, whose second number is the
 * `1` an omitted one already means.
 * @returns {string[]} the property names, sorted
 */
const collectRatioProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		if (reachableProductions(entry.syntax).has("ratio")) out.push(name);
	}
	return out.sort();
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
	/** @type {(name: string) => string[]} */
	const keywords = (name) =>
		(definitions.get(name) || "")
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
			// Equal-length too: `inline flex` is `inline-flex` in the same bytes, which
			// buys a minify nothing and is the only spelling a target reading no
			// multi-keyword `display` understands.
			if (short !== null && short.length <= pair.length) {
				out.push([pair, short]);
			}
		}
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The bare keywords an alternation names, followed through `<production>`
 * references. A `<function()>` alternative contributes nothing.
 * @param {string[]} productions the productions to expand
 * @returns {string[]} the keywords, sorted
 */
const collectAlternationKeywords = (productions) => {
	const names = new Set();
	/** @type {(syntax: string, seen: Set<string>) => void} */
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
	for (const production of productions) {
		walk(definitions.get(production) || "", new Set([production]));
	}
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
 * The keywords one `<repeat-style>` axis can be, so a pair is only collapsed
 * where both halves really are that axis rather than some other slot of a
 * shorthand the production merely sits in (`background: red red`).
 * @returns {string[]} the keywords, sorted
 */
const collectRepeatStyleKeywords = () => {
	const syntax = definitions.get("repeat-style") || "";
	// Only the `{1,2}` group pairs: `repeat-x` / `repeat-y` beside it are the
	// one-value spellings of a pair, and repeating one of those is not a value.
	const pairing = /\[([^\]]*)\]\{1,2\}/.exec(syntax);
	if (pairing === null) {
		throw new Error("`repeat-style` no longer states a `{1,2}` group");
	}
	return lowerSorted(acceptedValues(pairing[1]).keywords);
};

// One alternative of a property's grammar that is a position, and one that is
// any bare keyword beside it (`auto`, `normal`, `none`).
const POSITION_ALTERNATIVE_REGEXP = /^<(?:bg-)?position>#?$/;
const KEYWORD_ALTERNATIVE_REGEXP = /^[a-z-]+$/;

/**
 * The properties whose value *is* a position, so each edge keyword in one names
 * the percentage that axis resolves to. Read off the top-level alternation
 * rather than by reachability: `<position>` is reachable from any property
 * taking an `<image>` (a gradient states one), where it is not the value.
 * @returns {string[]} the property names, sorted
 */
const collectPositionProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		const alternatives = entry.syntax.split("|").map((one) => one.trim());
		if (!alternatives.some((one) => POSITION_ALTERNATIVE_REGEXP.test(one))) {
			continue;
		}
		if (
			!alternatives.every(
				(one) =>
					POSITION_ALTERNATIVE_REGEXP.test(one) ||
					KEYWORD_ALTERNATIVE_REGEXP.test(one)
			)
		) {
			continue;
		}
		out.push(name);
	}
	return out.sort();
};

// A shadow states its offsets as `<length>{MIN,MAX}`; MIN of them are the two
// offsets every shadow needs.
const SHADOW_LENGTHS_REGEXP = /<length>\{(\d+),(\d+)\}/;

/**
 * Each property whose value is a list of shadows -> how many lengths a shadow
 * cannot go below. The grammar states the range itself (`<length>{2,4}` on
 * `box-shadow`, `{2,3}` on `text-shadow`), so a trailing zero past the minimum
 * is a value the notation already implies.
 * @returns {[string, number][]} the entries, sorted by property
 */
const collectShadowProperties = () => {
	/** @type {[string, number][]} */
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		let minimum = null;
		for (const raw of references(entry.syntax)) {
			const definition = definitions.get(raw);
			if (definition === undefined) continue;
			const range = SHADOW_LENGTHS_REGEXP.exec(definition);
			if (range === null) continue;
			// Two productions naming different ranges is no single shadow shape.
			if (minimum !== null && minimum !== Number(range[1])) return [];
			minimum = Number(range[1]);
		}
		if (minimum !== null) out.push([name, minimum]);
	}
	return out.sort(([a], [b]) => (a < b ? -1 : 1));
};

// The block productions that hold rules rather than declarations. An at-rule
// whose block holds rules is one two adjacent blocks can be merged for.
const RULE_HOLDING_BLOCKS = [
	"<group-rule-body>",
	"<block-contents>",
	"<stylesheet>",
	"<rule-list>",
	"<qualified-rule-list>"
];

/**
 * The gradient functions, each with the last position its own stop list means:
 * `<color-stop-length>` runs to `100%`, `<color-stop-angle>` to the same turn
 * spelled either way. Read off `<gradient>`, so a seventh needs nothing here.
 * @param {SyntaxTable} syntaxTable the `syntaxes.json` to read
 * @param {PartialSyntaxTable} functionTable the `functions.json` to read
 * @returns {[string, string[]][]} `[function, last-position spellings]`, sorted
 */
const collectGradientFunctions = (syntaxTable, functionTable) => {
	const entry = syntaxTable.gradient;
	if (entry === undefined) {
		throw new Error("`<gradient>` is gone from mdn-data");
	}
	/** @type {[string, string[]][]} */
	const out = [];
	for (const name of entry.syntax.match(/<([a-z-]+)\(\)>/g) || []) {
		const bare = name.slice(1, -3);
		const call = functionTable[`${bare}()`];
		if (call === undefined || typeof call.syntax !== "string") {
			throw new Error(`\`${bare}()\` is gone from mdn-data`);
		}
		// The stop list is reached through the `<x-gradient-syntax>` the call names.
		const named = /<([a-z-]+)>/.exec(call.syntax);
		const body =
			named !== null && syntaxTable[named[1]] !== undefined
				? syntaxTable[named[1]].syntax
				: call.syntax;
		const angular = body.includes("<angular-color-stop-list>");
		out.push([bare, angular ? ["100%", "360deg", "1turn"] : ["100%"]]);
	}
	return out.sort(([a], [b]) => (a < b ? -1 : 1));
};

/**
 * The at-rules whose adjacent blocks merge into one: their block holds rules, and
 * their prelude states a condition rather than naming the one thing the block
 * belongs to (`@keyframes`, whose later block replaces the earlier).
 * @param {PartialSyntaxTable} atRuleTable the `at-rules.json` to read
 * @returns {string[]} the names without the `@`, sorted
 */
const collectMergeableAtRules = (atRuleTable) => {
	const replaced = new Set(SUPPLEMENT.replacedByNameAtRules);
	const out = [];
	for (const [name, entry] of Object.entries(atRuleTable)) {
		const syntax = entry.syntax;
		if (typeof syntax !== "string") continue;
		if (!RULE_HOLDING_BLOCKS.some((one) => syntax.includes(one))) continue;
		const bare = name.slice(1);
		if (!replaced.has(bare)) out.push(bare);
	}
	for (const one of replaced) {
		const entry = atRuleTable[`@${one}`];
		if (entry === undefined) {
			throw new Error(`\`@${one}\` is gone from mdn-data`);
		}
	}
	return out.sort();
};

/**
 * Each `<filter-function>` whose argument the grammar marks optional -> the
 * amount an omitted one means, so writing that amount says nothing. The set is
 * read off `<filter-function>`; only the amounts are stated.
 * @returns {[string, string][]} the entries, sorted by function
 */
const collectFilterFunctionOmitted = () => {
	const list = definitions.get("filter-function");
	if (list === undefined) {
		throw new Error("`<filter-function>` is gone from mdn-data");
	}
	const stated = new Map(SUPPLEMENT.filterFunctionOmitted);
	/** @type {[string, string][]} */
	const out = [];
	for (const raw of references(list)) {
		const definition = definitions.get(raw);
		if (definition === undefined) continue;
		const name = raw.slice(0, -2);
		// A `?` before the closing paren is what makes the argument optional.
		if (!/\?\s*\)\s*$/.test(definition)) continue;
		const omitted = stated.get(name);
		if (omitted === undefined) {
			throw new Error(`\`${name}()\` gained an optional argument`);
		}
		out.push([name, omitted]);
	}
	for (const [name] of stated) {
		if (!out.some(([one]) => one === name)) {
			throw new Error(`\`${name}()\` no longer takes an optional argument`);
		}
	}
	return out.sort(([a], [b]) => (a < b ? -1 : 1));
};

// The five edge keywords a `<position>` names, and the classes an offset in one
// can be.
const POSITION_AXIS_KEYWORDS = ["bottom", "center", "left", "right", "top"];
const POSITION_OFFSET_CLASSES = new Set(["length", "percentage"]);

/**
 * The properties whose position is spelled out rather than named, and which may
 * carry a depth past it — `transform-origin` states both axes longhand and
 * takes a z `<length>` after them. Told by everything the grammar accepts: the
 * five edge keywords and an offset, nothing else. A third component keeps the
 * collapse away from the depth.
 * @returns {string[]} the property names, sorted
 */
const collectSpelledPositionProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		const values = acceptedValues(entry.syntax);
		if (
			values.keywords.size === POSITION_AXIS_KEYWORDS.length &&
			POSITION_AXIS_KEYWORDS.every((one) => values.keywords.has(one)) &&
			[...values.classes].every((one) => POSITION_OFFSET_CLASSES.has(one))
		) {
			out.push(name);
		}
	}
	return out.sort();
};

/**
 * Split a value definition on one top-level combinator, `[…]` / `<…>` / `(…)`
 * nesting aside. A top-level `|` while splitting on `||` means the definition is
 * an alternation of whole values rather than a set of slots.
 * @param {string} syntax the value definition
 * @returns {string[] | null} the parts, or `null` when there are not two of them
 */
const splitTopLevelAnyOf = (syntax) => {
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < syntax.length; i++) {
		const character = syntax[i];
		if (character === "[" || character === "<" || character === "(") {
			depth++;
		} else if (character === "]" || character === ">" || character === ")") {
			depth--;
		} else if (depth === 0 && character === "|") {
			if (syntax[i + 1] !== "|") return null;
			parts.push(syntax.slice(start, i));
			start = i + 2;
			i++;
		}
	}
	parts.push(syntax.slice(start));
	return parts.length > 1 ? parts.map((part) => part.trim()) : null;
};

// A whole-value `[…]` group, and a slot a keyword may be dropped out of: one
// term, no `/` — a slot behind a `/` is reached through another one's value.
const WHOLE_GROUP_REGEXP = /^\[([\s\S]*)\][#?*+!]?$/;
const SINGLE_TERM_SLOT_REGEXP = /^(?:<'?[a-z-]+'?>|\[[^[\]]*\])[#?*+]?$/;

/**
 * The body of a `[…]` enclosing the whole definition, if the first `[` is the
 * one the last `]` closes.
 * @param {string} text a value definition
 * @returns {string | null} the body, or `null` when the brackets enclose less
 */
const enclosingGroupBody = (text) => {
	const match = WHOLE_GROUP_REGEXP.exec(text);
	if (match === null) return null;
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "[") {
			depth++;
		} else if (text[i] === "]" && --depth === 0) {
			return i === text.lastIndexOf("]") ? match[1].trim() : null;
		}
	}
	return null;
};

// A layered shorthand names its last layer apart from the rest, that one
// holding the slots the earlier layers do not — `background`'s color. A value
// with no top-level comma is exactly that layer, which is the only shape the
// printer folds.
const FINAL_LAYER_REGEXP = /^<[a-z-]+>[#?*+]*\s*,\s*<([a-z-]+)>$/;

/**
 * A shorthand's slots: the `||` its value is an order-free set of, reached
 * through the one named production a `<single-transition>#`- or
 * `<bg-layer># , <final-bg-layer>`-shaped grammar states it as.
 * @param {string} syntax the shorthand's value definition
 * @returns {string[] | null} the slots, or `null` when the value is not such a set
 */
const shorthandSlots = (syntax) => {
	let text = syntax.trim();
	const named = /^<([a-z-]+)>[#?*+]*$/.exec(text);
	const layered = named === null ? FINAL_LAYER_REGEXP.exec(text) : null;
	const production =
		named !== null ? named[1] : layered !== null ? layered[1] : null;
	if (production !== null && syntaxes[production] !== undefined) {
		text = syntaxes[production].syntax.trim();
	}
	const direct = splitTopLevelAnyOf(text);
	if (direct !== null) return direct;
	const body = enclosingGroupBody(text);
	return body === null ? null : splitTopLevelAnyOf(body);
};

/**
 * The keyword a property's initial value is, following a shorthand down to the
 * first longhand that states one.
 * @param {string} name the property name
 * @param {number} depth the shorthand nesting walked so far
 * @returns {string | null} the keyword, or `null` when the initial is not one
 */
const initialKeyword = (name, depth) => {
	const entry = properties[name];
	if (entry === undefined || depth > 4) return null;
	// `mdn-data`'s own types omit the field, which its data does carry.
	const initial = /** @type {{ initial?: string | string[] }} */ (entry)
		.initial;
	if (Array.isArray(initial)) return initialKeyword(initial[0], depth + 1);
	if (typeof initial !== "string") return null;
	return /^[a-z][a-z-]*$/.test(initial) ? initial : null;
};

/**
 * Every value a slot takes that a printed component can be spelled as: its
 * keywords, and each function it accepts written `name()`. A function is what
 * `acceptedValues` does not report — it walks into one rather than naming it —
 * and a slot filled by one is filled just as much as by a keyword.
 * @param {string} slot the slot's value definition
 * @returns {Set<string>} the spellings, lowercased
 */
const slotSpellings = (slot) => {
	const out = new Set();
	for (const keyword of acceptedValues(slot).keywords) {
		out.add(keyword.toLowerCase());
	}
	const seen = new Set();
	/**
	 * @param {string} source a value definition to walk
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
		walkValueSyntax(tree, (node) => {
			const statedSpellings =
				node.type === "type" ? statedClassSpellings(node.name) : null;
			if (node.type === "function") {
				out.add(`${node.name.toLowerCase()}()`);
			} else if (statedSpellings !== null) {
				for (const one of statedSpellings) out.add(one);
			} else if (node.type === "type" && syntaxes[node.name] !== undefined) {
				expand(syntaxes[node.name].syntax);
			} else if (
				node.type === "property" &&
				properties[node.name] !== undefined &&
				typeof properties[node.name].syntax === "string"
			) {
				expand(/** @type {string} */ (properties[node.name].syntax));
			}
		});
	};
	expand(slot);
	return out;
};

/**
 * Each shorthand -> the keywords a value of it may drop, and for each the other
 * spellings its slot takes. A slot holding what it already defaults to says
 * nothing, but only under three conditions, and every one of them is a rewrite
 * that turned a declaration the engine drops into one it accepts:
 * the keyword must be named by exactly one slot (`animation`'s `none` is both a
 * name and a fill mode), every value that slot takes must be one the spellings
 * report (`mask: url(a.svg) none` fills one slot twice and is dropped, so
 * removing the `none` would revive it — a `<color>` slot cannot be checked that
 * way, `#fff` being no spelling), and it must be a slot of its own rather than
 * one reached through a `/`.
 * @returns {[string, [string, string[]][]][]} the entries, sorted by property
 */
const collectShorthandInitialKeywords = () => {
	/** @type {[string, [string, string[]][]][]} */
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		// A prefixed spelling is a different property with its own grammar.
		if (name.startsWith("-")) continue;
		const initial = /** @type {{ initial?: string | string[] }} */ (entry)
			.initial;
		if (!Array.isArray(initial) || typeof entry.syntax !== "string") continue;
		const slots = shorthandSlots(entry.syntax);
		if (slots === null) continue;
		const accepted = slots.map((slot) => {
			const values = acceptedValues(slot);
			return {
				named: new Set([...values.keywords].map((one) => one.toLowerCase())),
				spellings: slotSpellings(slot),
				spelledOnly: [...values.classes].every(isSpelledClass)
			};
		});
		/** @type {[string, string[]][]} */
		const droppable = [];
		for (const longhand of initial) {
			const keyword = initialKeyword(longhand, 0);
			if (keyword === null) continue;
			const hits = [];
			for (let i = 0; i < accepted.length; i++) {
				if (accepted[i].named.has(keyword)) hits.push(i);
			}
			if (hits.length !== 1) continue;
			const slot = accepted[hits[0]];
			if (!slot.spelledOnly) continue;
			if (slots[hits[0]].includes("/")) continue;
			if (!SINGLE_TERM_SLOT_REGEXP.test(slots[hits[0]])) continue;
			droppable.push([keyword, [...slot.spellings].sort()]);
		}
		if (droppable.length !== 0) {
			out.push([name, droppable.sort(([a], [b]) => (a < b ? -1 : 1))]);
		}
	}
	return out.sort(([a], [b]) => (a < b ? -1 : 1));
};

/**
 * Each `font-stretch` keyword -> the percentage it names. The keywords are read
 * off the property's own grammar; only the percentages are stated.
 * @returns {[string, string][]} the entries, in the grammar's order
 */
const collectFontStretchPercentages = () => {
	const entry = properties["font-stretch"];
	if (entry === undefined || typeof entry.syntax !== "string") {
		throw new Error("`font-stretch` is gone from mdn-data");
	}
	const named = acceptedValues(entry.syntax).keywords;
	const stated = new Map(SUPPLEMENT.fontStretchPercentages);
	for (const keyword of named) {
		if (!stated.has(keyword)) {
			throw new Error(`\`font-stretch\` gained the keyword \`${keyword}\``);
		}
	}
	for (const [keyword] of stated) {
		if (!named.has(keyword)) {
			throw new Error(`\`font-stretch\` no longer states \`${keyword}\``);
		}
	}
	return [...stated];
};

/**
 * The keywords each axis of a `<position>` accepts -> the percentage that
 * keyword resolves to. The two axes are read off the grammar's own
 * `[ … ] || [ … ]` alternative; only the percentages are stated.
 * @returns {[string, string][][]} the x axis' entries, then the y axis'
 */
const collectPositionKeywordAxes = () => {
	const entry = syntaxes.position;
	if (entry === undefined) throw new Error("`position` is gone from mdn-data");
	let tree = parseValueSyntax(entry.syntax);
	while (tree.type === "group" || tree.type === "parens") tree = tree.body;
	const branches = tree.type === "oneOf" ? tree.items : [tree];
	const pairing = branches.find(
		(one) => one.type === "anyOf" && one.items.length === 2
	);
	if (pairing === undefined || pairing.type !== "anyOf") {
		throw new Error("`position` no longer states its two axes as `A || B`");
	}
	const axes = pairing.items.map((axis) => {
		const body = axis.type === "group" ? axis.body : axis;
		const items = body.type === "oneOf" ? body.items : [body];
		return items.map((one) => {
			if (one.type !== "keyword") {
				throw new Error("a `position` axis is no longer a list of keywords");
			}
			return one.name;
		});
	});
	const stated = new Map(SUPPLEMENT.positionKeywordPercentages);
	const named = new Set();
	for (const axis of axes) {
		for (const name of axis) {
			if (!stated.has(name)) {
				throw new Error(`\`position\` gained the keyword \`${name}\``);
			}
			named.add(name);
		}
	}
	for (const [name] of stated) {
		if (!named.has(name)) {
			throw new Error(`\`position\` no longer states \`${name}\``);
		}
	}
	return axes.map((axis) =>
		axis.sort().map((name) => [name, /** @type {string} */ (stated.get(name))])
	);
};

/**
 * Each property whose initial value is a keyword shorter than `initial` itself
 * -> that keyword. `initial` computes to the initial value whatever the
 * property, so the two are the same declaration and the shorter one is written.
 * A shorthand states its initial as the list of its longhands rather than a
 * value, which is what keeps one out of this table. An initial `mdn-data` writes
 * as prose comes from `SUPPLEMENT.initialValueKeywords` and is then judged by
 * these same tests.
 * @returns {[string, string][]} the entries, sorted by property
 */
// The keywords that stand for a length: the ones `<line-width>` and
// `<absolute-size>` offer beside `<length>`, which is where CSS states them.
const lengthKeywords = new Set();
for (const production of ["line-width", "absolute-size"]) {
	const entry = syntaxes[production];
	if (entry === undefined) continue;
	for (const branch of String(entry.syntax).split("|")) {
		const keyword = branch.trim();
		if (/^[a-z][a-z-]*$/.test(keyword)) lengthKeywords.add(keyword);
	}
}

const collectInitialValueKeywords = () => {
	/** @type {[string, string][]} */
	const out = [];
	const stated = new Map(SUPPLEMENT.initialValueKeywords);
	for (const [name, entry] of Object.entries(properties)) {
		// `mdn-data`'s own types omit the field, which its data does carry.
		const written = /** @type {{ initial?: string | string[] }} */ (entry)
			.initial;
		const supplemented = stated.get(name);
		if (supplemented !== undefined && /^[a-z][a-z-]*$/.test(String(written))) {
			throw new Error(
				`\`${name}\`'s initial is now a keyword \`mdn-data\` states — drop it from SUPPLEMENT.initialValueKeywords`
			);
		}
		const initial = supplemented === undefined ? written : supplemented;
		if (typeof initial !== "string") continue;
		if (!/^[a-z][a-z-]*$/.test(initial)) continue;
		if (initial.length >= "initial".length) continue;
		// `mdn-data` states an initial its own property does not accept for a few
		// entries (`flood-opacity`'s reads `black`), and writing one back would
		// swap a working declaration for one the engine drops. Only a keyword the
		// property's own grammar names is the value `initial` computes to.
		if (typeof entry.syntax !== "string") continue;
		if (!acceptedValues(entry.syntax).keywords.has(initial)) continue;
		// A keyword that is itself a length is scaled by `zoom`, where the
		// `initial` it would replace is resolved before zoom applies — so the two
		// are one value without a zoom and two under one. Measured in headless
		// Chromium: `outline-width:initial` computes to 1.5px at `zoom:2` and
		// `outline-width:medium` to 3px.
		if (lengthKeywords.has(initial)) continue;
		out.push([name, initial]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * The properties whose top-level value grammar is keywords alone — no
 * `<custom-ident>`, no string, no name of the author's — so an identifier
 * standing directly in one of their values is one of those keywords, which CSS
 * matches ASCII case-insensitively. A call's arguments are not top level, so a
 * property whose keywords stand beside one (`transform`, `font-variant`) is here
 * too: the call is its own token, read against the function's own grammar.
 * @returns {string[]} the property names, sorted
 */
const collectKeywordOnlyProperties = () => {
	const out = [];
	for (const [name, entry] of Object.entries(properties)) {
		if (typeof entry.syntax !== "string") continue;
		const { keywords, classes } = acceptedValues(entry.syntax);
		// No keyword at all means a grammar that spelled none out — nothing to
		// match a value against, so the property claims no identifier.
		if (classes.size !== 0 || keywords.size === 0) continue;
		out.push(name);
	}
	return out.sort();
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
		// The An+B pseudo-classes are exactly the ones whose grammar names it.
		if (
			entry.status === "standard" &&
			typeof entry.syntax === "string" &&
			entry.syntax.includes("<an+b>") &&
			name.startsWith(":") &&
			name.endsWith("()")
		) {
			names.push(name.slice(1, -2));
		}
	}
	return names.sort();
};

// An An+B pseudo-class counting from one end, and the end it counts from. The
// pair a name is built out of, so the counterpart is spelled rather than listed.
const NTH_END_REGEXP = /^nth-(last-)?(child|of-type)$/;

/**
 * The An+B pseudo-classes whose first or last element has a name of its own:
 * `:nth-child(1)` is what `:first-child` selects. Both halves come from the
 * selector table — the An+B ones by their grammar, the counterpart by the name
 * the pair builds, kept only when the table has it as a selector too.
 * @returns {[string, string][]} `[function, pseudo-class]`, sorted
 */
const collectNthNamedEquivalents = () => {
	/** @type {[string, string][]} */
	const pairs = [];
	for (const name of collectNthPseudoFunctions()) {
		const end = NTH_END_REGEXP.exec(name);
		if (end !== null) {
			const named = `${end[1] === undefined ? "first" : "last"}-${end[2]}`;
			const entry = /** @type {PartialSelectorTable} */ (selectors)[
				`:${named}`
			];
			if (entry !== undefined && entry.status === "standard") {
				pairs.push([name, named]);
			}
		}
	}
	return pairs.sort(([one], [other]) => (one < other ? -1 : 1));
};

/**
 * Each property whose initial keyword may be dropped from a multi-component
 * value, as `property -> [keyword, slot]`. The keyword comes from the property
 * table, and it must really be the initial and really be one alternative of a
 * top-level `||` group, so a spec moving either way fails generation rather than
 * the page. `slot` is every keyword that group offers — the alternatives the
 * keyword is chosen among, which a value may name only once.
 * @param {string[]} names the properties stated to have one
 * @param {PartialPropertyTable} propertyTable where their grammars are read
 * @returns {[string, [string, string[]]][]} `[property, [keyword, slot]]`, sorted
 */
const collectOmittableInitialKeywords = (
	names = SUPPLEMENT.omittableInitialKeywords,
	propertyTable = properties
) => {
	/** @type {[string, [string, string[]]][]} */
	const out = [];
	for (const name of [...names].sort()) {
		const property = propertyTable[name];
		const initial = /** @type {string} */ (property.initial);
		const syntax = /** @type {string} */ (property.syntax);
		const tree = parseValueSyntax(syntax);
		/**
		 * @param {SyntaxNode} node a syntax node
		 * @returns {boolean} whether it spells exactly the initial keyword
		 */
		const isInitial = (node) =>
			node.type === "group"
				? isInitial(node.body)
				: node.type === "oneOf"
					? node.items.some(isInitial)
					: node.type === "keyword" && node.name === initial;
		/**
		 * @param {SyntaxNode} node the group the keyword was found in
		 * @returns {string[]} every keyword it offers
		 */
		const keywords = (node) => {
			/** @type {string[]} */
			const found = [];
			walkValueSyntax(node, (each) => {
				if (each.type === "keyword") found.push(each.name);
			});
			return found;
		};
		const group =
			tree.type === "anyOf"
				? tree.items.find((item) => isInitial(item))
				: undefined;
		// The supplement states the keyword is droppable; mdn-data must still agree.
		if (group === undefined) {
			throw new Error(`No omittable '${initial}' in '${name}': ${syntax}`);
		}
		out.push([name, [initial, keywords(group).sort()]]);
	}
	return out;
};

/**
 * Every name CSS matches ASCII case-insensitively whose canonical spelling is
 * not all-lowercase, keyed by the lowercase form the printer arrives with. Read
 * off the two datasets that carry such names — the function table
 * (`translateX()`, `skewY()`) and the unit table (`Hz`, `kHz`, `Q`) — rather
 * than listed, so a name either dataset re-cases lands as a diff. Nothing else
 * needs an entry: every property, at-rule and selector `mdn-data` states is
 * spelled lowercase already.
 * @returns {[string, string][]} lowercased name -> canonical spelling, sorted
 */
const collectCanonicalNames = () => {
	/** @type {Map<string, string>} */
	const canonical = new Map();
	for (const name of Object.keys(functions)) {
		const bare = name.slice(0, -2);
		if (bare !== bare.toLowerCase()) canonical.set(bare.toLowerCase(), bare);
	}
	for (const name of Object.keys(units)) {
		if (name !== name.toLowerCase()) canonical.set(name.toLowerCase(), name);
	}
	return [...canonical].sort(([a], [b]) => (a < b ? -1 : 1));
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
 * @param {ColorNameTable} colorName the named-color byte values
 * @returns {[number, string][]} the entries, sorted by packed value
 */
const collectColorNames = (colorName) => {
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
 * @param {ColorNameTable} colorName the named-color byte values
 * @returns {[string, string][]} the entries, sorted by name
 */
const collectShorterColorSpellings = (colorNames, colorName) => {
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
	`new Map([${entries
		.map(([key, value]) => `["${key}", "${value}"]`)
		.join(", ")}])`;

/**
 * @param {[string, number][]} entries string-keyed, number-valued pairs
 * @returns {string} the `Map` literal
 */
const countMapLiteral = (entries) =>
	`new Map([${entries
		.map(([key, value]) => `["${key}", ${value}]`)
		.join(", ")}])`;

/**
 * A prefix table's `new Map([…])` literal: `name -> [prefix, [browser, from,
 * to][]][]`. `Infinity` prints as a bare identifier the runtime reads back.
 * @param {[string, [string, [string, number, number][]][]][]} table the axis table
 * @returns {string} its `new Map([…])` literal — prettier wraps it on emit
 */
// The `[browser, from, to]` windows every prefix table shares, pooled: a window
// list is stated once and each spelling names the one it reads. Two thirds of
// them repeat — 24 constructs share Gecko's one window alone.
/** @type {Map<string, number>} */
const prefixWindowIndex = new Map();
/** @type {[string, number, number][][]} */
const prefixWindows = [];

/**
 * @param {[string, number, number][]} browsers one spelling's windows
 * @returns {number} its index in the pool
 */
const poolPrefixWindows = (browsers) => {
	const key = browsers
		.map(([browser, from, to]) => `${browser},${from},${to}`)
		.join(" ");
	let at = prefixWindowIndex.get(key);
	if (at === undefined) {
		at = prefixWindows.length;
		prefixWindows.push(browsers);
		prefixWindowIndex.set(key, at);
	}
	return at;
};

/**
 * @param {[string, [string, [string, number, number][]][]][]} table one axis' prefix table
 * @returns {string} the `Map` literal, each window list named by its pool index
 */
const prefixLiteral = (table) =>
	`new Map([${table
		.map(([name, prefixes]) => {
			const body = prefixes
				.map(
					([prefix, browsers]) =>
						`["${prefix}", ${poolPrefixWindows(browsers)}]`
				)
				.join(", ");
			return `["${name}", [${body}]]`;
		})
		.join(", ")}])`;

/**
 * @param {[number, number][]} entries number-keyed pairs
 * @returns {string} the `Map` literal
 */
const numberMapLiteral = (entries) =>
	`new Map([${entries
		.map(([key, value]) => `[${key}, ${value}]`)
		.join(", ")}])`;

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
/** @type {{ cssWideKeywords: string[], cubicBezierKeywords: [string, string][], flexKeywords: [string, string][], fontWeightNumbers: [string, string][], fontStretchPercentages: [string, string][], filterFunctionOmitted: [string, string][], positionKeywordPercentages: [string, string][], legacyPseudoElements: string[], compoundContinuations: string[], featurelessPseudoClasses: string[], initialValueKeywords: [string, string][], unmergeableSlotKeywords: [string, string][], zeroUnitKeepingProperties: string[], calcRejectingProperties: string[], clampedValueRanges: [string, string, number, number][], autoSecondValueProperties: string[], defaultGradientDirections: string[], xAxisTransforms: [string, string][], negativeAcceptingProperties: string[], placeShorthands: string[], oneValuePairShorthands: string[], familyShorthands: string[], orderedShorthands: string[], omittableInitialKeywords: string[], pairLonghandOverrides: [string, string[]][], droppableWhenEmptyAtRules: string[], replacedByNameAtRules: string[], classSpellings: [string, string[]][], absoluteUnitScale: [string, string, number][], unitConversionTargets: string[], angleUnits: string[], quarterTurnAngle: [string, number][], eighthTurnSine: (number | null)[], eighthTurnTangent: (number | null)[], mathFunctionFold: [string, string, string, string, string | null, boolean][], mathPrimitives: [string, string][], predefinedCounterStyles: string[], predefinedCounterNames: string[], cssModulesKeywordSupplement: [string, string, number][] }} */

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
	// Filter Effects 1 states, per function's prose, the amount an omitted
	// argument means; the grammar only marks the argument optional.
	filterFunctionOmitted: [
		["blur", "0"],
		["brightness", "1"],
		["contrast", "1"],
		["grayscale", "1"],
		["hue-rotate", "0"],
		["invert", "1"],
		["opacity", "1"],
		["saturate", "1"],
		["sepia", "1"]
	],
	// CSS Fonts 4 §4.5 gives each width keyword as that percentage, in a prose
	// table; the grammar names the keywords beside a `<percentage>` without
	// saying which one each is.
	fontStretchPercentages: [
		["ultra-condensed", "50%"],
		["extra-condensed", "62.5%"],
		["condensed", "75%"],
		["semi-condensed", "87.5%"],
		["normal", "100%"],
		["semi-expanded", "112.5%"],
		["expanded", "125%"],
		["extra-expanded", "150%"],
		["ultra-expanded", "200%"]
	],
	// CSS Backgrounds 3 §3.6 defines each edge keyword as that percentage of the
	// axis, as prose — the grammar states which axis a keyword is, never what it
	// resolves to. The axes themselves are read off `<position>`.
	positionKeywordPercentages: [
		["left", "0%"],
		["center", "50%"],
		["right", "100%"],
		["top", "0%"],
		["bottom", "100%"]
	],
	// Selectors 4 §3.3: engines must accept the one-colon spelling for the
	// pseudo-elements CSS 1 and 2 introduced. Only these four — `::selection` and
	// the rest have no legacy spelling.
	legacyPseudoElements: ["before", "after", "first-line", "first-letter"],
	// What may follow the `*` a compound selector implies: another simple
	// selector in the same compound. Selector syntax, not a value grammar.
	compoundContinuations: [":", ".", "#", "["],
	// The pseudo-classes that select a featureless element, which matches no type
	// or universal selector (CSS Scoping 1 §3.1) — so the `*` a compound implies
	// before one is not redundant, it is what stops the selector matching.
	// `mdn-data` states each selector's syntax and says nothing about this.
	// Measured in headless Chromium: `:host` matches, `*:host` does not.
	featurelessPseudoClasses: ["host", "host-context"],
	// The initial values `mdn-data` states as prose rather than as the keyword the
	// spec gives, so nothing reads them off its `initial` field. Only a property
	// whose initial really is one fixed keyword belongs here: `text-size-adjust`
	// and `-ms-content-zooming` read differently per user agent, and `all` has no
	// initial at all. Each is judged by the same tests a derived one is, and the
	// generator throws once `mdn-data` states the keyword itself.
	// CSS Text 3 gives `text-align: start`; `mdn-data` carries CSS 2.1's nameless
	// value as `startOrNamelessValueIfLTRRightIfRTL`. Measured in headless
	// Chromium under both `dir=ltr` and `dir=rtl`: `initial`, `start` and `unset`
	// compute alike and paint the glyph at the same offset.
	initialValueKeywords: [["text-align", "start"]],
	// Not derivable, no grammar says the unit matters here: IE 11 drops a unitless
	// `flex-basis`, and Chrome rejects `overflow-clip-margin:0` the spec allows.
	zeroUnitKeepingProperties: ["flex-basis", "overflow-clip-margin"],
	// A merge is all-or-nothing: a shorthand carrying one value the engine cannot
	// read is dropped whole, taking the sibling longhands with it, where the
	// longhand alone would only have lost itself. So a keyword the grammar states
	// but no engine reads must not be merged. `mdn-data` states the grammar and
	// no dataset states what ships. Measured over all 119 family slot keywords in
	// headless Chromium: this is the only one it rejects that the printer merges.
	unmergeableSlotKeywords: [["flex-wrap", "balance"]],
	// Not derivable, a grammar naming `<length>` says `calc()` is valid there:
	// Chrome takes no `calc()` in `overflow-clip-margin`, as it takes no bare `0`.
	calcRejectingProperties: ["overflow-clip-margin"],
	// Ranges the spec clamps a `calc()` to at computed-value time while rejecting
	// the literal outright, so folding one to the value it equals switches the
	// declaration off. CSS Fonts 4 §2.3 bounds `oblique` at ±90deg; `mdn-data`
	// states `oblique <angle>` with no range, and no dataset carries the clamp.
	clampedValueRanges: [["font-style", "deg", -90, 90]],
	// CSS Backgrounds 3 §3.9 / CSS Masking 1 §4.5: these spell an omitted second
	// value `auto`, not the first repeated. Their shared grammar cannot say so.
	autoSecondValueProperties: ["background-size", "mask-size"],
	// CSS Images 3 §3.1: a directionless linear gradient runs top to bottom,
	// which each of these spells. An equivalence no dataset states.
	defaultGradientDirections: ["to bottom", "180deg", "0.5turn"],
	// CSS Transforms 1 §11: a one-axis call is the pair whose other component is
	// the 0 it means. Names the pair spelling, which the grammar does not.
	xAxisTransforms: [
		["translatex", "translate"],
		["skewx", "skew"]
	],
	// Newer than the longhands they merge, so the merge would lose both
	// declarations. Named because `mdn-data` states no version.
	placeShorthands: ["place-content", "place-items", "place-self"],
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
	// The four `border-<side>` shorthands reset their three longhands and nothing
	// else, which is what keeps them here while `border` itself stays out: it
	// clears all five `border-image-*` longhands, and a rule merging into it would
	// clear what an earlier rule set. The four logical edges answer the same way
	// as their physical twins (they state the same grammar, and Chromium keeps
	// every `border-image-*` across one), so they are here too.
	// `transition` also resets `transition-behavior` and folds a list to one item.
	familyShorthands: [
		"border-block-end",
		"border-block-start",
		"border-bottom",
		"border-inline-end",
		"border-inline-start",
		"border-left",
		"border-right",
		"border-top",
		"column-rule",
		"flex-flow",
		"list-style",
		"outline",
		"text-decoration",
		"text-emphasis",
		"text-wrap"
	],
	// The shorthands whose grammar juxtaposes its longhands in a fixed order
	// rather than offering them order-free, so `familyShorthands`' slot-by-value
	// reading does not apply and the merge writes them by position. Named rather
	// than derived: what an omitted slot leaves is the shorthand's own default,
	// not the longhand's initial (`flex` reads a missing basis as `0%` where
	// `flex-basis` starts at `auto`), and no dataset states that.
	orderedShorthands: ["flex"],
	// Both the property's initial and a whole `||` group, so omitting the group
	// leaves it — `mdn-data` states neither, and `aspect-ratio:auto 3/2` is not one.
	omittableInitialKeywords: ["grid-auto-flow"],
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
	// At-rules holding rules whose prelude names one thing rather than stating a
	// condition, so a second block with the same prelude replaces the first
	// instead of adding to it — merging two would change which one runs.
	// `@layer` is not here: a layer's blocks do add to it.
	replacedByNameAtRules: ["keyframes"],
	// CSS Values 4 §4.5.1: `<url> = <url()> | <src()>`. `syntaxes.json` has no
	// `<url>` entry and `functions.json` neither call, so the one class whose
	// every value is a call has to be stated for the walk to spell it.
	classSpellings: [["url", ["url()", "src()"]]],
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

// BCD browser id -> the browserslist names it answers for. BCD-only engines
// (oculus, deno, bun, nodejs) have no browserslist query, so a prefix they alone
// would need can never be selected — those ids are absent and their entries drop
// out. `ie_mob` is Windows Phone's Trident on the desktop version line (IE Mobile
// 11 is Trident 7, as IE 11 is), which is why it reads IE's windows; BCD tracks
// no separate id for it. Everything else browserslist can select and no dataset
// covers (`op_mini`, `and_uc`, `and_qq`, `baidu`, `kaios`, `bb`) is absent here
// and skipped, which is what lightningcss's own target mapping does.
const BCD_TO_BROWSERSLIST = new Map([
	["chrome", ["chrome"]],
	["chrome_android", ["and_chr"]],
	["edge", ["edge"]],
	["firefox", ["firefox"]],
	["firefox_android", ["and_ff"]],
	["ie", ["ie", "ie_mob"]],
	["opera", ["opera"]],
	["opera_android", ["op_mob"]],
	["safari", ["safari"]],
	["safari_ios", ["ios_saf"]],
	["samsunginternet_android", ["samsung"]],
	["webview_android", ["android"]],
	["webview_ios", ["ios_saf"]]
]);

// The engine prefixes in play at all. A spelling carrying none of them is no
// engine's — `-khtml-`, which died with KHTML — and is never reached for.
const ENGINE_PREFIXES = ["-webkit-", "-moz-", "-ms-", "-o-"];

// The prefix a browser's engine actually uses, so an obsolete cross-engine one
// BCD still lists (Safari keeps `-khtml-user-select` from its KHTML days, with
// no removal version) is never carried and so never added. Edge and Opera list
// both their old and Chromium prefixes; the version windows sort out which
// applies. A browser absent here contributes no prefixes.
const BROWSER_PREFIXES = new Map([
	["chrome", ["-webkit-"]],
	["chrome_android", ["-webkit-"]],
	["safari", ["-webkit-"]],
	["safari_ios", ["-webkit-"]],
	["samsunginternet_android", ["-webkit-"]],
	["webview_android", ["-webkit-"]],
	["webview_ios", ["-webkit-"]],
	["edge", ["-webkit-", "-ms-"]],
	["opera", ["-webkit-", "-o-"]],
	["opera_android", ["-webkit-", "-o-"]],
	["firefox", ["-moz-"]],
	["firefox_android", ["-moz-"]],
	["ie", ["-ms-"]]
]);

// The browserslist names the tables above can answer for: every BCD id that maps
// to one and has an engine prefix, `ie_mob` among them, reading the same Trident
// as desktop IE. A selection naming anything else — `op_mini`, `and_uc`,
// `and_qq`, `baidu`, `kaios`, `bb` — states nothing and is skipped.
const prefixBrowsers = [
	...new Set(
		[...BCD_TO_BROWSERSLIST]
			.filter(([bcdBrowser]) => BROWSER_PREFIXES.has(bcdBrowser))
			.flatMap(([, names]) => names)
	)
].sort();

// The version a browser that never shipped a construct is given, and the one a
// spelling still prefixed today is unprefixed at. Finite and a plain number, so
// the two version tables hold numbers alone — `Infinity` prints as an identifier
// and costs the emitted file six times its lines. Far past any real version
// (`major * 100000 + minor` tops out around 15 million) and past the one
// `_encodeBrowserVersion` gives Safari TP, which has to compare as the newest
// version that exists rather than as one that never arrives.
const NEVER = 1e15;

// How `NEVER` is written into the emitted tables: the same value, twelve
// characters shorter than the digits it stands for, and still a plain number
// literal — which is what lets prettier pack the tables many to a line.
const NEVER_LITERAL = "1e15";

/**
 * One version as the emitted tables spell it.
 * @param {number} version an encoded version
 * @returns {string} its literal
 */
const versionLiteral = (version) =>
	version === NEVER ? NEVER_LITERAL : String(version);

// A BCD version to one comparable integer `major * 100000 + minor`, so the
// runtime orders versions with a plain `<` and never a float compare (`15.10`
// must sort above `15.4`). `true` (since forever) is 0; `≤n` is that n; a
// version that never arrived (`false` / `null`) is null.
/**
 * @param {string | boolean | null | undefined} version a BCD `version_added` / `version_removed`
 * @returns {number | null} the encoded version, or null when it never applied
 */
const encodeVersion = (version) => {
	if (version === true) return 0;
	if (version === false || version === null || version === undefined) {
		return null;
	}
	const [major, minor] = String(version).replace(/^≤/, "").split(".");
	const parsedMajor = Number.parseInt(major, 10);
	if (Number.isNaN(parsedMajor)) return null;
	return parsedMajor * 100000 + (Number.parseInt(minor, 10) || 0);
};

// Each ability the printer reaches for -> the BCD paths that all have to have
// arrived for it. Stated because no dataset names what the printer emits.
/** @type {[string, string[]][]} */
const SUPPORTED_FEATURES = [
	[
		"colorHexAlpha",
		["css.types.color.rgb_hexadecimal_notation.alpha_hexadecimal_notation"]
	],
	[
		"gradientDoublePosition",
		[
			"css.types.gradient.linear-gradient.doubleposition",
			"css.types.gradient.radial-gradient.doubleposition",
			"css.types.gradient.conic-gradient.doubleposition"
		]
	],
	["displayTwoValues", ["css.properties.display.multi-keyword_values"]],
	["colorFunction", ["css.types.color.color"]],
	["colorMix", ["css.types.color.color-mix"]],
	["hwbColors", ["css.types.color.hwb"]],
	["lightDark", ["css.types.color.light-dark"]],
	["labColors", ["css.types.color.lab", "css.types.color.lch"]],
	["oklabColors", ["css.types.color.oklab", "css.types.color.oklch"]],
	["insetShorthand", ["css.properties.inset"]],
	["mediaQueryRange", ["css.at-rules.media.range_syntax"]],
	["overflowTwoValues", ["css.properties.overflow.multiple_keywords"]],
	[
		"placeShorthand",
		[
			"css.properties.place-content",
			"css.properties.place-items",
			"css.properties.place-self"
		]
	]
];

/**
 * Whether a BCD entry is the plain spelling arriving for good — prefixed,
 * renamed, flagged and later-removed support are none of them the arrival.
 * @param {BcdSupport} entry a BCD support entry
 * @returns {boolean} true when it is the plain spelling, still supported
 */
const isPlainSupport = (entry) =>
	!entry.prefix &&
	!entry.alternative_name &&
	!entry.version_removed &&
	!entry.flags;

/**
 * When each browser first read every one of a feature's constructs, as
 * `[browserslistName, since][]`. Only a plain arrival counts, and a browser BCD
 * never gives one carries `NEVER`, which no version satisfies.
 * @param {string[]} paths BCD paths that all have to have arrived
 * @returns {[string, number][]} the versions, by browserslist name
 */
const collectSupportedFrom = (paths) => {
	/** @type {Map<string, number>} */
	const since = new Map();
	for (const path of paths) {
		/** @type {EXPECTED_ANY} */
		let node = bcd;
		for (const key of path.split(".")) node = node && node[key];
		const compat = node && node.__compat;
		if (!compat || !compat.support) {
			throw new Error(`no BCD support block at ${path}`);
		}
		for (const [bcdBrowser, raw] of Object.entries(compat.support)) {
			const names = BCD_TO_BROWSERSLIST.get(bcdBrowser);
			if (names === undefined) continue;
			const entries = Array.isArray(raw) ? raw : [raw];
			const plain = entries.find(isPlainSupport);
			const added = plain ? encodeVersion(plain.version_added) : null;
			for (const name of names) {
				const before = since.get(name);
				const version = added === null ? NEVER : added;
				if (before === undefined || version > before) since.set(name, version);
			}
		}
	}
	return [...since].sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * When each browser first read every standard pseudo-class and pseudo-element,
 * keyed by the spelling a selector carries (`:hover`, `::before`, `:nth-child`).
 * Only a pseudo every target reads may be joined into a selector list, because
 * one selector an engine cannot parse invalidates the whole list.
 * @returns {[string, [string, number][]][]} the versions, by spelling
 */
const collectSelectorSupport = () => {
	/** @type {[string, [string, number][]][]} */
	const table = [];
	for (const entry of Object.values(selectors)) {
		if (entry.status !== "standard") continue;
		const match = /^(::?)([-\w]+)/.exec(entry.syntax || "");
		if (match === null) continue;
		const [, colons, name] = match;
		if (!bcd.css.selectors[name]) continue;
		table.push([
			`${colons}${name}`,
			collectSupportedFrom([`css.selectors.${name}`])
		]);
	}
	return table.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * Both support tables as one profile pool and two name-to-profile maps. Every
 * profile covers the same browsers in the same order, so the versions are a
 * positional array — the names are stated once for all of them — and a profile
 * two constructs share is stored once.
 * @param {[string, [string, number][]][][]} tables the tables to pool
 * @returns {{ browsers: string[], profiles: number[][], indexes: number[][] }} the pooled form
 */
const poolSupport = (tables) => {
	const browsers = tables[0][0][1].map(([browser]) => browser);
	/** @type {Map<string, number>} */
	const seen = new Map();
	/** @type {number[][]} */
	const profiles = [];
	const indexes = tables.map((table) =>
		table.map(([, versions]) => {
			const row = browsers.map((browser) => {
				const found = versions.find(([name]) => name === browser);
				if (found === undefined) {
					throw new Error(`no ${browser} in a support profile`);
				}
				return found[1];
			});
			const key = row.join(",");
			let at = seen.get(key);
			if (at === undefined) {
				at = profiles.length;
				profiles.push(row);
				seen.set(key, at);
			}
			return at;
		})
	);
	return { browsers, profiles, indexes };
};

/**
 * @param {[string, [string, number][]][]} table the features
 * @param {number[]} indexes each one's profile
 * @returns {string} the `Map` literal
 */
const supportLiteral = (table, indexes) =>
	`new Map([${table
		.map(([name], at) => `["${name}", ${indexes[at]}]`)
		.join(", ")}])`;

// A vendor spelling BCD states as an alternative name rather than a prefix, with
// its decoration stripped: `":-webkit-any()"` -> `-webkit-any`. The same engine
// filter applies, so a rename that is not a vendor's (`:matches()`, `:after`) is
// not one of these.
const ALTERNATIVE_DECORATION = /^:{1,2}|\(\)$/g;

// One construct's vendor spellings as `spelling -> [browserslistName, from,
// to][]`: a target browser at version V needs the spelling exactly when
// `from <= V < to`. A browser whose unprefixed form never arrived carries
// `NEVER`, so it always needs it (Safari and `-webkit-user-select`); one
// whose windows are all empty is dropped. A spelling is the name with the
// engine's prefix on it, or — where `alternatives` is on, which is the axes
// whose legacy spelling is a rename rather than a prefix — the vendor name BCD
// states instead (`:is()` was `:-webkit-any()`, never `:-webkit-is()`).
/**
 * @param {BcdCompat | undefined} compat the construct's `__compat` block
 * @param {string} name the construct's unprefixed name
 * @param {boolean} alternatives whether a vendor rename counts as a spelling
 * @returns {[string, [string, number, number][]][] | null} `[spelling, [browser, from, to][]][]`, or null
 */
const collectPrefixes = (compat, name, alternatives) => {
	if (!compat || !compat.support) return null;
	/** @type {Map<string, Map<string, [number, number]>>} */
	const byPrefix = new Map();
	for (const [bcdBrowser, raw] of Object.entries(compat.support)) {
		const names = BCD_TO_BROWSERSLIST.get(bcdBrowser);
		if (names === undefined) continue;
		const allowed = BROWSER_PREFIXES.get(bcdBrowser);
		if (allowed === undefined) continue;
		const entries = Array.isArray(raw) ? raw : [raw];
		let unprefixedFrom = null;
		for (const entry of entries) {
			// The earliest plain entry is the arrival — BCD's newest-first ordering
			// is convention, not schema.
			if (!isPlainSupport(entry)) continue;
			const added = encodeVersion(entry.version_added);
			if (
				added !== null &&
				(unprefixedFrom === null || added < unprefixedFrom)
			) {
				unprefixedFrom = added;
			}
		}
		const target = unprefixedFrom === null ? NEVER : unprefixedFrom;
		// Every spelling that covers this browser's gap, before deciding which of
		// them it may be told about.
		/** @type {[BcdSupport, string, number][]} */
		const covering = [];
		for (const entry of entries) {
			if (entry.flags) continue;
			const spelling = entry.prefix
				? entry.prefix + name
				: alternatives && entry.alternative_name
					? entry.alternative_name.replace(ALTERNATIVE_DECORATION, "")
					: null;
			if (spelling === null) continue;
			const prefixedFrom = encodeVersion(entry.version_added);
			if (prefixedFrom === null || prefixedFrom >= target) continue;
			covering.push([entry, spelling, prefixedFrom]);
		}
		// Its own engine's prefix — or, where nothing of its own covers the gap,
		// whichever engine's does: Firefox reads `-webkit-line-clamp` and no
		// `line-clamp` of any spelling, so `-moz-` alone leaves it unprefixed.
		// A selector prefix is compound (`-webkit-input-` on `::placeholder`), so
		// match at the start rather than whole — that still drops an obsolete
		// cross-engine one (`-khtml-` on `user-select`), which is no engine's here.
		const reachable = covering.some(([, spelling]) =>
			allowed.some((prefix) => spelling.startsWith(prefix))
		)
			? allowed
			: ENGINE_PREFIXES;
		for (const [entry, spelling, prefixedFrom] of covering) {
			if (!reachable.some((prefix) => spelling.startsWith(prefix))) continue;
			// A spelling the engine itself dropped ends there rather than where the
			// unprefixed one arrived: `-moz-outline` went in Firefox 3.6, six years
			// before the property it stood for was complete.
			const spellingRemoved = encodeVersion(entry.version_removed);
			const until =
				spellingRemoved !== null && spellingRemoved < target
					? spellingRemoved
					: target;
			let browsers = byPrefix.get(spelling);
			if (browsers === undefined) {
				browsers = new Map();
				byPrefix.set(spelling, browsers);
			}
			// `safari_ios` and `webview_ios` both fold onto `ios_saf`; keep the
			// widest window (earliest prefix start, latest unprefixed arrival).
			for (const browser of names) {
				const existing = browsers.get(browser);
				browsers.set(
					browser,
					existing === undefined
						? [prefixedFrom, until]
						: [
								Math.min(existing[0], prefixedFrom),
								Math.max(existing[1], until)
							]
				);
			}
		}
	}
	if (byPrefix.size === 0) return null;
	/** @type {[string, [string, number, number][]][]} */
	const out = [];
	for (const [spelling, browsers] of byPrefix) {
		/** @type {[string, number, number][]} */
		const list = [...browsers].map(([browser, [from, to]]) => [
			browser,
			from,
			to
		]);
		out.push([spelling, list]);
	}
	return out;
};

// The prefixed constructs the minifier looks up, one table per axis it meets a
// prefix on: a property name, a selector, an at-rule. Standard entries only — a
// construct BCD marks non-standard is a vendor's own, not a spelling of a
// standard one.
/**
 * @param {{ [name: string]: BcdNode }} group a BCD axis (`css.properties`, `css.selectors`, `css["at-rules"]`)
 * @param {boolean=} alternatives whether a vendor rename counts as a spelling
 * @param {boolean=} supplement whether the stated prefixes belong to this axis
 * @returns {[string, [string, [string, number, number][]][]][]} the axis table, sorted
 */
const collectPrefixTable = (
	group,
	alternatives = false,
	supplement = false
) => {
	/** @type {[string, [string, [string, number, number][]][]][]} */
	const table = [];
	for (const [name, node] of Object.entries(group)) {
		if (name.startsWith("__")) continue;
		const spellings = collectPrefixes(node.__compat, name, alternatives);
		if (spellings === null) continue;
		const excluded = PROPERTY_SPELLING_EXCLUSIONS.get(name);
		const kept =
			excluded === undefined
				? spellings
				: spellings.filter(
						([spelling]) => !excluded.some((p) => spelling.startsWith(p))
					);
		if (kept.length !== 0) table.push([name, kept]);
	}
	if (supplement) applyPrefixSupplement(table);
	applyEngineSwitch(table);
	if (!alternatives) return table.sort((a, b) => (a[0] < b[0] ? -1 : 1));
	// A spelling two names claim cannot be right for both, and the one whose own
	// prefix makes it is the one that means it: BCD gives `:-moz-placeholder` to
	// `::placeholder` as its prefix and to `:placeholder-shown` as a rename, and
	// only the first is what an old engine did with it.
	/** @type {Map<string, number>} */
	const claims = new Map();
	for (const [, spellings] of table) {
		for (const [spelling] of spellings) {
			claims.set(spelling, (claims.get(spelling) || 0) + 1);
		}
	}
	/** @type {[string, [string, [string, number, number][]][]][]} */
	const kept = [];
	for (const [name, spellings] of table) {
		const own = spellings.filter(
			([spelling]) =>
				/** @type {number} */ (claims.get(spelling)) === 1 ||
				spelling.endsWith(name)
		);
		if (own.length !== 0) kept.push([name, own]);
	}
	return kept.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

// Prefixes BCD records nowhere, though the spelling is real and needed. Where
// the engine that read it still ships, a current one still parses the spelling —
// Gecko's own property database is where an open-ended window comes from; where
// it does not, caniuse records it, through autoprefixer's table, and that window
// is closed history which cannot move again. Checked against BCD as the file is
// built, so an entry it catches up on fails generation rather than sitting here
// unread.
// A stated spelling may also carry the keywords the older property read in place
// of the standard ones, as `[standard, legacy][]`. Where it does, the map is the
// legacy property's whole grammar: a value naming anything else is one that
// property cannot read, so no copy is written for it at all.
// A browser whose version line changed engine mid-way reads, from that version
// on, whatever the new engine reads. BCD records the change as a prefixed window
// opening after the unprefixed one, which the rule above drops as an alias added
// for compatibility — right for Gecko taking `-webkit-transform` in Firefox 49,
// wrong here, where the earlier unprefixed support belonged to another engine.
const ENGINE_SWITCH = new Map([
	["opera", { bcd: "opera", base: "chrome", from: 15 }],
	["op_mob", { bcd: "opera_android", base: "chrome", from: 14 }]
]);

/**
 * Where the base browser's versions land on the derived browser's own line,
 * learned from BCD: every feature both date unprefixed after the change is one
 * observation of the same engine release under two numbers.
 * @param {string} bcdName the derived browser's BCD id
 * @param {string} baseName the base browser's BCD id
 * @param {number} from the derived browser's first version on the new engine
 * @returns {(version: number) => number} base version -> derived version
 */
const engineVersionLine = (bcdName, baseName, from) => {
	/** @type {(support: BcdSupport | BcdSupport[] | undefined) => number | null} */
	const unprefixed = (support) => {
		const list = Array.isArray(support) ? support : support ? [support] : [];
		const entry = list.find(isPlainSupport);
		return entry ? encodeVersion(entry.version_added) : null;
	};
	/**
	 * @param {{ [key: string]: EXPECTED_ANY }} node a BCD subtree
	 * @returns {Generator<BcdCompat>} every `__compat` block under it
	 */
	function* walk(node) {
		for (const [key, value] of Object.entries(node)) {
			if (key === "__compat") yield /** @type {BcdCompat} */ (value);
			else if (value && typeof value === "object") yield* walk(value);
		}
	}
	/** @type {Map<number, number>} */
	const earliest = new Map();
	const floor = encodeVersion(String(from));
	for (const compat of walk(bcd.css)) {
		const base = unprefixed(compat.support[baseName]);
		const derived = unprefixed(compat.support[bcdName]);
		// Only what both engines gained after the change speaks to the alignment.
		if (
			base === null ||
			derived === null ||
			derived < /** @type {number} */ (floor)
		) {
			continue;
		}
		const known = earliest.get(base);
		if (known === undefined || derived < known) earliest.set(base, derived);
	}
	// A feature landing in base `b` and derived `d` says `d` already carries `b`,
	// so it bounds every base version at or below it: the answer for `b` is the
	// earliest derived release seen against any base version from `b` on.
	const points = [...earliest].sort((a, b) => a[0] - b[0]);
	let running = NEVER;
	for (let i = points.length - 1; i >= 0; i--) {
		running = Math.min(running, points[i][1]);
		points[i][1] = running;
	}
	return (version) => {
		if (version >= NEVER) return NEVER;
		for (const [base, derived] of points) {
			if (base >= version) {
				return Math.max(derived, /** @type {number} */ (floor));
			}
		}
		return NEVER;
	};
};

/**
 * Give every spelling the base browser needs the window it needs on a derived
 * browser's own line. Widens, like the supplement — a window BCD already records
 * is never narrowed by the alignment.
 * @param {[string, [string, [string, number, number][]][]][]} table the axis table so far
 * @returns {void}
 */
const applyEngineSwitch = (table) => {
	const lines = new Map(
		[...ENGINE_SWITCH].map(([browser, { bcd: bcdName, base, from }]) => [
			browser,
			{
				base,
				from: encodeVersion(String(from)),
				at: engineVersionLine(bcdName, base, from)
			}
		])
	);
	for (const [, spellings] of table) {
		for (const [, windows] of spellings) {
			for (const [browser, { base, from, at }] of lines) {
				const baseWindow = windows.find(([known]) => known === base);
				if (baseWindow === undefined) continue;
				const start = Math.max(/** @type {number} */ (from), at(baseWindow[1]));
				const end = at(baseWindow[2]);
				if (end <= start) continue;
				const known = windows.find(([one]) => one === browser);
				if (known === undefined) {
					windows.push([browser, start, end]);
				} else {
					known[1] = Math.min(known[1], start);
					known[2] = Math.max(known[2], end);
				}
			}
		}
	}
};

// The windows BCD keeps for `inline-size`, shared by the whole logical-size family.
/** @type {[string, string, string | number][]} */
const LOGICAL_SIZE_WINDOWS = [
	["chrome", "8", "57"],
	["and_chr", "18", "57"],
	["opera", "15", "44"],
	["op_mob", "14", "43"],
	["safari", "5.1", "12.1"],
	["ios_saf", "5", "12.2"],
	["samsung", "1", "7"],
	["android", "4.4", "57"]
];

/** @type {Map<string, [string, [string, string, string | number][], [string, string][]?][]>} */
const PREFIX_SUPPLEMENT = new Map([
	[
		// Multi-column's own gap, prefixed until the module went unprefixed — Chrome
		// 50, Firefox 52, Safari 9. The `column-gap` of a flex or grid container is
		// a different feature, which no engine ever prefixed, and no browser needing
		// this one laid out either.
		"column-gap",
		[
			[
				"-webkit-column-gap",
				[
					["chrome", "4", "50"],
					["safari", "3.1", "9"],
					["ios_saf", "3.2", "9"],
					["opera", "15", "37"],
					// caniuse tracks the old WebViews and the current one, nothing
					// between, so 5 stands for "any of the old ones".
					["android", "2.1", "5"],
					["samsung", "4", "5"]
				]
			],
			["-moz-column-gap", [["firefox", "2", "52"]]]
		]
	],
	[
		// Multi-column's shorthand and its `column-span`, unprefixed with the rest
		// of multi-column layout. BCD dates their `-webkit-` at the version the unprefixed form
		// arrived, which is 46 versions after Chrome first read it. Only WebKit's,
		// which a current Blink still parses: caniuse marks the whole feature
		// prefixed for Firefox, which never read `-moz-column-span` at all.
		"columns",
		[
			[
				"-webkit-columns",
				[
					["chrome", "4", "50"],
					["safari", "3.1", "9"],
					["ios_saf", "3.2", "9"],
					["opera", "15", "37"],
					["android", "2.1", "5"],
					["samsung", "4", "5"]
				]
			]
		]
	],
	[
		// Multi-column's own width, standard from Firefox 50 by BCD alone. Gecko's
		// property database spells it `-moz-column-width` through 51 and gains the
		// standard name in 52 with the rest of the module, so dropping the prefix
		// leaves 50 and 51 a declaration Gecko cannot parse.
		"column-width",
		[
			[
				"-moz-column-width",
				[
					["firefox", "1.5", "52"],
					["and_ff", "4", "52"]
				]
			]
		]
	],
	// WebKit's logical sizing, named after the physical axis rather than the logical
	// one. BCD records the pair `inline-size` / `block-size` as the renames they are
	// and files the other four as a prefix on the standard name, which no engine's
	// property list has ever carried. The six move as one: every WebKit and Blink
	// release carrying `-webkit-logical-width` carries all six, and BCD dates the
	// standard names of all six alike on every browser it records — so each takes
	// the windows of the rename BCD does keep.
	["min-inline-size", [["-webkit-min-logical-width", LOGICAL_SIZE_WINDOWS]]],
	["max-inline-size", [["-webkit-max-logical-width", LOGICAL_SIZE_WINDOWS]]],
	["min-block-size", [["-webkit-min-logical-height", LOGICAL_SIZE_WINDOWS]]],
	["max-block-size", [["-webkit-max-logical-height", LOGICAL_SIZE_WINDOWS]]],
	[
		"column-span",
		[
			[
				"-webkit-column-span",
				[
					["chrome", "4", "50"],
					["safari", "3.1", "9"],
					["ios_saf", "3.2", "9"],
					["opera", "15", "37"],
					["android", "2.1", "5"],
					["samsung", "4", "5"]
				]
			]
		]
	],
	// CSS Shapes, which WebKit shipped prefixed from Safari 7.1 and unprefixed at
	// 10.1. BCD has the `-webkit-` entry for `shape-margin` alone.
	[
		"shape-outside",
		[
			[
				"-webkit-shape-outside",
				[
					["safari", "7.1", "10.1"],
					["ios_saf", "8", "10.3"]
				]
			]
		]
	],
	[
		"shape-margin",
		[
			[
				"-webkit-shape-margin",
				[
					["safari", "7.1", "10.1"],
					["ios_saf", "8", "10.3"]
				]
			]
		]
	],
	[
		"shape-image-threshold",
		[
			[
				"-webkit-shape-image-threshold",
				[
					["safari", "7.1", "10.1"],
					["ios_saf", "8", "10.3"]
				]
			]
		]
	],
	// IE 10's flexbox, the 2012 draft: it renamed the properties rather than
	// prefixing them, and BCD records the renames unevenly — `-ms-flex-positive`
	// as an `alternative_name`, `-ms-flex-order` as a `-ms-` prefix on `order`
	// (a spelling nothing ever read), and the rest not at all, some as plain
	// unprefixed support at 10 the engine did not have. Only the five whose
	// values IE 10 reads unchanged are stated: `-ms-flex-align`,
	// `-ms-flex-pack`, `-ms-flex-line-pack` and `-ms-flex-item-align` also
	// rename their keywords (`flex-start` is `start`, `space-around` is
	// `distribute`), which is a value rewrite and not a spelling.
	[
		"order",
		[
			[
				"-ms-flex-order",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				]
			]
		]
	],
	[
		"flex-shrink",
		[
			[
				"-ms-flex-negative",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				]
			]
		]
	],
	[
		"flex-basis",
		[
			[
				"-ms-flex-preferred-size",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				]
			]
		]
	],
	[
		"flex-wrap",
		[
			[
				"-ms-flex-wrap",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				]
			]
		]
	],
	[
		"flex-flow",
		[
			[
				"-ms-flex-flow",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				]
			]
		]
	],
	// The four the 2012 draft also renamed the keywords of, each map being that
	// property's whole grammar there. Only `writing-mode` is left out of the
	// renames: IE reads `horizontal-tb` as `lr-tb` or `rl-tb` depending on the
	// element's `direction`, which the declaration alone does not say.
	[
		"align-items",
		[
			[
				"-ms-flex-align",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				],
				[
					["flex-start", "start"],
					["flex-end", "end"],
					["center", "center"],
					["baseline", "baseline"],
					["stretch", "stretch"]
				]
			]
		]
	],
	[
		"align-self",
		[
			[
				"-ms-flex-item-align",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				],
				[
					["auto", "auto"],
					["flex-start", "start"],
					["flex-end", "end"],
					["center", "center"],
					["baseline", "baseline"],
					["stretch", "stretch"]
				]
			]
		]
	],
	[
		"justify-content",
		[
			[
				"-ms-flex-pack",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				],
				[
					["flex-start", "start"],
					["flex-end", "end"],
					["center", "center"],
					["space-between", "justify"],
					["space-around", "distribute"]
				]
			]
		]
	],
	[
		"align-content",
		[
			[
				"-ms-flex-line-pack",
				[
					["ie", "10", "11"],
					["ie_mob", "10", "11"]
				],
				[
					["flex-start", "start"],
					["flex-end", "end"],
					["center", "center"],
					["space-between", "justify"],
					["space-around", "distribute"],
					["stretch", "stretch"]
				]
			]
		]
	],
	// Presto, where BCD dates the unprefixed arrival earlier than caniuse — the
	// only dataset that tracks Opera and Opera Mobile version by version, and the
	// one autoprefixer reads. `border-image` it marks prefixed on every Presto
	// version that has it at all (`a x` from 11 through 12.1, on both), so Presto
	// never shipped it unprefixed and BCD's `opera: 11` cannot be right; the
	// windows end where the engine did. `text-overflow` desktop dropped the
	// prefix at 11 exactly as BCD says, but Opera Mobile kept needing it through
	// 12 and only went plain at 12.1.
	[
		"border-image",
		[
			[
				"-o-border-image",
				[
					["opera", "10.5", "15"],
					["op_mob", "11", "14"]
				]
			]
		]
	],
	["text-overflow", [["-o-text-overflow", [["op_mob", "10", "12.1"]]]]],
	// Presto shipped `object-fit` as its own extension well before the spec, and
	// caniuse dates the prefixed form a year earlier than BCD does, on desktop and
	// mobile alike. `background-size` went plain at 10.5, not at 10.
	[
		"object-fit",
		[
			[
				"-o-object-fit",
				[
					["opera", "10.6", "15"],
					["op_mob", "11", "14"]
				]
			]
		]
	],
	[
		"object-position",
		[
			[
				"-o-object-position",
				[
					["opera", "10.6", "15"],
					["op_mob", "11", "14"]
				]
			]
		]
	],
	["background-size", [["-o-background-size", [["opera", "9.5", "10.2"]]]]],
	// `text-size-adjust`, which BCD misses at both ends. IE Mobile is the one
	// browser it does not track, so that reads desktop IE's windows — right for
	// the same engine on the same version line, but caniuse has the property
	// prefixed on IE Mobile 10 and 11 and absent from desktop IE altogether, and
	// 11 is IE Mobile's last release. And BCD calls desktop Firefox unsupported,
	// which is a statement about effect: Gecko's property database carries
	// `-moz-text-size-adjust` as a real longhand no preference gates, with
	// `-webkit-text-size-adjust` aliased onto it and no unprefixed spelling at
	// all — so a Firefox target losing the `-moz-` one is left with a declaration
	// Gecko cannot parse. Desktop shares Android's style system, and so its
	// version.
	// EdgeHTML gets both spellings, because the two datasets name different ones
	// and neither states why: BCD records `-webkit-` per feature, while caniuse
	// only marks the version prefixed and resolves the spelling from a
	// browser-wide `-ms-` default it applies to every feature. No engine is
	// reachable to settle it, and the pair costs one declaration where a wrong
	// single one costs the property.
	[
		"text-size-adjust",
		[
			[
				"-ms-text-size-adjust",
				[
					["ie_mob", "10", "12"],
					["edge", "12", "19"]
				]
			],
			["-moz-text-size-adjust", [["firefox", "14", NEVER]]]
		]
	],
	// WebKit named the ruby side and the vertical orientation after the box rather
	// than the flow, and kept those names on the prefixed properties: a Chromium 41,
	// 80 and 141 alike read `-webkit-ruby-position: before` and no `over`, and
	// `-webkit-text-orientation: vertical-right` and no `mixed`. BCD records the
	// windows and no dataset records the renaming, so the copy went out spelled the
	// standard way and no engine could read it.
	[
		"ruby-position",
		[
			[
				"-webkit-ruby-position",
				[],
				[
					["over", "before"],
					["under", "after"]
				]
			]
		]
	],
	[
		"text-orientation",
		[
			[
				"-webkit-text-orientation",
				[],
				[
					["mixed", "vertical-right"],
					["upright", "upright"],
					["sideways", "sideways"]
				]
			]
		]
	],
	// BCD dates WebKit's unprefixed `font-kerning` at Safari 9, caniuse a release
	// later on desktop and three years later on iOS. The feature is this one
	// property, so the usual feature-wider-than-property explanation cannot
	// account for the gap, and a current WebKit still carries the alias — so the
	// later boundary is the one a target of that age is served by.
	[
		"font-kerning",
		[
			[
				"-webkit-font-kerning",
				[
					["safari", "6", "9.1"],
					["ios_saf", "6", "12"]
				]
			]
		]
	]
]);

/**
 * The keyword maps the stated spellings carry, as `spelling -> standard ->
 * legacy`. Built from `PREFIX_SUPPLEMENT` itself, so a map can only exist for a
 * spelling that table writes.
 * @returns {[string, [string, string][]][]} `[spelling, [standard, legacy][]][]`
 */
const collectPrefixSpellingKeywords = () => {
	/** @type {[string, [string, string][]][]} */
	const out = [];
	for (const [, stated] of PREFIX_SUPPLEMENT) {
		for (const [spelling, , keywords] of stated) {
			if (keywords !== undefined) out.push([spelling, keywords]);
		}
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * Fold the stated windows into an axis table, widening what BCD records rather
 * than replacing it. An entry BCD has caught up on entirely — every browser of
 * it already covered — fails generation rather than sitting here unread.
 * @param {[string, [string, [string, number, number][]][]][]} table the axis table so far
 * @returns {void}
 */
const applyPrefixSupplement = (table) => {
	for (const [name, stated] of PREFIX_SUPPLEMENT) {
		let entry = table.find(([known]) => known === name);
		if (entry === undefined) {
			entry = [name, []];
			table.push(entry);
		}
		let widened = false;
		for (const [spelling, windows, keywords] of stated) {
			// An entry may state the keywords a legacy spelling reads rather than a
			// window, where BCD has the window and no dataset has the renaming.
			if (keywords !== undefined) widened = true;
			// Stated in full rather than as a prefix: an engine's legacy spelling is as
			// often a rename (`-ms-flex-order` for `order`) as a prefix on the name.
			if (spelling === name || !spelling.startsWith("-")) {
				throw new Error(
					`\`${spelling}\` stated for \`${name}\` is not a vendor spelling.`
				);
			}
			let spellingEntry = entry[1].find(([known]) => known === spelling);
			if (spellingEntry === undefined) {
				spellingEntry = [spelling, []];
				entry[1].push(spellingEntry);
			}
			for (const [browser, from, to] of windows) {
				const start = /** @type {number} */ (encodeVersion(from));
				// `NEVER` where the engine still has no unprefixed spelling.
				const end =
					typeof to === "number"
						? to
						: /** @type {number} */ (encodeVersion(to));
				const known = spellingEntry[1].find(
					([browsers]) => browsers === browser
				);
				if (known === undefined) {
					spellingEntry[1].push([browser, start, end]);
					widened = true;
					continue;
				}
				if (known[1] > start || known[2] < end) widened = true;
				known[1] = Math.min(known[1], start);
				known[2] = Math.max(known[2], end);
			}
		}
		if (!widened) {
			throw new Error(
				`BCD now covers every window stated for \`${name}\`, so its PREFIX_SUPPLEMENT entry is no longer needed — drop it.`
			);
		}
	}
};

// A property spelling BCD records that no engine ever read, or that reads other
// values than the property it stands for. Everything else is read from BCD; each
// entry here carries why it cannot be.
const PROPERTY_SPELLING_EXCLUSIONS = new Map([
	// `-ms-order` was never read by anything: IE 10 spelled it `-ms-flex-order`,
	// which `PREFIX_SUPPLEMENT` states.
	["order", ["-ms-order"]],
	// WebKit's and Gecko's font smoothing are a different property under a
	// similar name: `font-smooth` takes `never`/`always`/a size, while
	// `-webkit-font-smoothing` takes `antialiased`/`subpixel-antialiased` and
	// `-moz-osx-font-smoothing` takes `grayscale`. Nothing carries over.
	["font-smooth", ["-webkit-font-smoothing", "-moz-osx-font-smoothing"]],
	// `-webkit-text-combine` reads `horizontal` where the standard property reads
	// `all`, so the rename alone writes a value it cannot parse. IE's
	// `-ms-text-combine-horizontal` does take the standard keywords.
	["text-combine-upright", ["-webkit-text-combine"]],
	// BCD files WebKit's logical sizing as a prefix on the standard name, but the
	// spelling it shipped is the rename `-webkit-max-logical-width`, which
	// `PREFIX_SUPPLEMENT` states with the rest of that family. No engine's property
	// list has ever carried this one.
	["max-inline-size", ["-webkit-max-inline-size"]],
	// BCD dates a `-webkit-` longhand on the old Android WebView, but the WebKit
	// fork that WebView ran carries the `-webkit-border-image` shorthand and no
	// longhand of it, and no other engine's property list has ever had this name.
	["border-image-slice", ["-webkit-border-image-slice"]]
]);

// A vendor spelling BCD files under a keyword it does not spell, by keyword —
// the grammar it belongs to decides these, not the property. Each carries why.
const VALUE_SPELLING_EXCLUSIONS = new Map([
	// `-webkit-fill-available` is WebKit's `stretch`, which fills the container;
	// `fit-content` shrinks to the content. BCD files it under both, and taking it
	// for `fit-content` lays the box out the other way round rather than the same
	// way under an older name. Neither autoprefixer nor lightningcss reaches for
	// it there either.
	["fit-content", ["-webkit-fill-available"]],
	// `text-align`'s `-webkit-` spellings outlived the versions BCD files them
	// under and no longer mean the same thing: a current Blink parses `center` and
	// `-webkit-center` both, and computes them differently — `-webkit-center`
	// centers block-level children, `center` only inline content. Taking one for
	// the other moves the box.
	["center", ["-webkit-center"]],
	["left", ["-webkit-left"]],
	["right", ["-webkit-right"]]
]);

// A value whose vendor spelling is not the same value spelled another way, which
// no dataset states — each carries why. Everything else is read from BCD.
const VALUE_KEYWORD_EXCLUSIONS = new Map([
	// IE's `-ms-grid` is the 2011 grid, whose tracks and placement are their own
	// prefixed properties: a copy of the declaration alone lays the box out by a
	// different algorithm rather than the same one under an older name. It is why
	// autoprefixer keeps IE grid behind an option of its own.
	["display", ["grid", "inline-grid"]]
]);

/**
 * The vendor spellings of a property's own keyword values, as `property ->
 * keyword -> [spelling, [browser, from, to][]][]`. A BCD sub-feature is read
 * only where the property's value-definition syntax names that keyword itself,
 * which is what tells a value (`display.flex`) from a context BCD files the same
 * way (`align-self.grid_context`) and from a function whose arguments the older
 * spelling did not take the same way (`background-image.image-set`).
 * @returns {[string, [string, [string, [string, number, number][]][]][]][]} the table, sorted
 */
// A value one engine shipped as a family, of which BCD records the prefix for
// part. Keyed by keyword, so generation fails if the keyword turns out to be read
// by more than one value grammar and a stated window cannot say which.
/** @type {Map<string, [string, [string, string, string][]][]>} */
const VALUE_PREFIX_SUPPLEMENT = new Map([
	// Blink shipped bidi isolation as one family, and a Chromium 41 parses
	// `-webkit-isolate-override` and `-webkit-plaintext` while parsing neither
	// plain name. BCD keeps the `-webkit-` window for `isolate` alone, so the
	// other two read as needing nothing and lose their only spelling.
	[
		"isolate-override",
		[
			[
				"-webkit-isolate-override",
				[
					["chrome", "16", "48"],
					["opera", "15", "35"]
				]
			]
		]
	],
	[
		"plaintext",
		[
			[
				"-webkit-plaintext",
				[
					["chrome", "16", "48"],
					["opera", "15", "35"]
				]
			]
		]
	]
]);

const collectPrefixedValues = () => {
	// What each property accepts, and what BCD records for those of its values
	// some engine spelled its own way.
	/** @type {Map<string, { keywords: string[], values: Map<string, [string, [string, number, number][]][]> }>} */
	const read = new Map();
	for (const [property, node] of Object.entries(bcd.css.properties)) {
		if (property.startsWith("__")) continue;
		const entry = /** @type {PartialPropertyTable} */ (properties)[property];
		if (!entry || !entry.syntax) continue;
		const keywords = lowerSorted(acceptedValues(entry.syntax).keywords);
		if (keywords.length === 0) continue;
		// The engines whose prefix the property itself already carries: BCD files
		// "IE read this value under `-ms-touch-action`" on the value as well, and a
		// copy spelling the value instead of the property says nothing an engine
		// reads. Dropped here rather than at the end, so what the property's own
		// spelling stands for cannot travel to the rest of its grammar.
		const propertyEngines = new Set(
			(collectPrefixes(node.__compat, property, false) || []).map(
				([spelling]) =>
					/** @type {RegExpExecArray} */ (/^(-[a-z]+-)/.exec(spelling))[1]
			)
		);
		/** @type {Map<string, [string, [string, number, number][]][]>} */
		const values = new Map();
		for (const [value, sub] of Object.entries(node)) {
			if (value === "__compat") continue;
			const compat = /** @type {BcdNode} */ (sub).__compat;
			if (!compat) continue;
			const keyword = value.toLowerCase();
			if (!keywords.includes(keyword)) continue;
			const spellings = (collectPrefixes(compat, value, true) || []).filter(
				([spelling]) =>
					!propertyEngines.has(
						/** @type {RegExpExecArray} */ (/^(-[a-z]+-)/.exec(spelling))[1]
					)
			);
			if (spellings.length !== 0) values.set(keyword, spellings);
		}
		read.set(property, { keywords, values });
	}
	// Properties accepting exactly the same keywords are one value grammar —
	// `block-size` is `<'width'>` and `height` expands to what `width` does — so a
	// spelling one of them records is the grammar's, not that property's. BCD
	// files `-webkit-max-content` under `width` and not under `height`, which is
	// the same value read by the same parser.
	/** @type {Map<string, Map<string, Map<string, Map<string, [number, number]>>>>} */
	const shared = new Map();
	for (const [, { keywords, values }] of read) {
		const grammar = keywords.join(" ");
		let byKeyword = shared.get(grammar);
		if (byKeyword === undefined) {
			byKeyword = new Map();
			shared.set(grammar, byKeyword);
		}
		for (const [keyword, spellings] of values) {
			let bySpelling = byKeyword.get(keyword);
			if (bySpelling === undefined) {
				bySpelling = new Map();
				byKeyword.set(keyword, bySpelling);
			}
			for (const [spelling, windows] of spellings) {
				let browsers = bySpelling.get(spelling);
				if (browsers === undefined) {
					browsers = new Map();
					bySpelling.set(spelling, browsers);
				}
				for (const [browser, from, to] of windows) {
					const existing = browsers.get(browser);
					browsers.set(
						browser,
						existing === undefined
							? [from, to]
							: [Math.min(existing[0], from), Math.max(existing[1], to)]
					);
				}
			}
		}
	}
	for (const [keyword, stated] of VALUE_PREFIX_SUPPLEMENT) {
		const grammars = [...shared].filter(([, byKeyword]) =>
			byKeyword.has(keyword)
		);
		if (grammars.length !== 1) {
			throw new Error(
				`\`${keyword}\` is read by ${grammars.length} value grammars, so a stated window cannot say which one it belongs to.`
			);
		}
		const bySpelling =
			/** @type {Map<string, Map<string, [number, number]>>} */ (
				grammars[0][1].get(keyword)
			);
		let widened = false;
		for (const [spelling, windows] of stated) {
			let browsers = bySpelling.get(spelling);
			if (browsers === undefined) {
				browsers = new Map();
				bySpelling.set(spelling, browsers);
			}
			for (const [browser, from, to] of windows) {
				const start = /** @type {number} */ (encodeVersion(from));
				const end = /** @type {number} */ (encodeVersion(to));
				const known = browsers.get(browser);
				if (known === undefined) {
					browsers.set(browser, [start, end]);
					widened = true;
					continue;
				}
				if (known[0] > start || known[1] < end) widened = true;
				browsers.set(browser, [
					Math.min(known[0], start),
					Math.max(known[1], end)
				]);
			}
		}
		if (!widened) {
			throw new Error(
				`BCD now covers every window stated for the value \`${keyword}\`, so its VALUE_PREFIX_SUPPLEMENT entry is no longer needed — drop it.`
			);
		}
	}
	/** @type {[string, [string, [string, [string, number, number][]][]][]][]} */
	const table = [];
	for (const [property, { keywords }] of read) {
		const byKeyword =
			/** @type {Map<string, Map<string, Map<string, [number, number]>>>} */ (
				shared.get(keywords.join(" "))
			);
		const excluded = VALUE_KEYWORD_EXCLUSIONS.get(property);
		/** @type {[string, [string, [string, number, number][]][]][]} */
		const values = [];
		for (const keyword of keywords) {
			const bySpelling = byKeyword.get(keyword);
			if (bySpelling === undefined) continue;
			if (excluded !== undefined && excluded.includes(keyword)) continue;
			const wrong = VALUE_SPELLING_EXCLUSIONS.get(keyword);
			/** @type {[string, [string, number, number][]][]} */
			const spellings = [];
			for (const [spelling, browsers] of bySpelling) {
				if (wrong !== undefined && wrong.includes(spelling)) continue;
				spellings.push([
					spelling,
					[...browsers].map(([browser, [from, to]]) => [browser, from, to])
				]);
			}
			if (spellings.length !== 0) values.push([keyword, spellings]);
		}
		if (values.length !== 0) table.push([property, values]);
	}
	return table.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * A value table's `new Map([…])` literal: `property -> keyword -> [spelling,
 * [browser, from, to][]][]`.
 * @param {[string, [string, [string, [string, number, number][]][]][]][]} table the value table
 * @returns {string} its `new Map([…])` literal
 */
const prefixedValueLiteral = (table) =>
	`new Map([${table
		.map(([property, values]) => `["${property}", ${prefixLiteral(values)}]`)
		.join(", ")}])`;

/**
 * Read every table out of the datasets and build the file they belong in.
 * Separate from writing it, so a test can assert the checked-in
 * `lib/css/data.js` is what this produces without touching the disk.
 * @returns {Promise<{ source: string, summary: string }>} the unformatted file and what it holds
 */
const collectData = async () => {
	// Imported here, not required at the top: `color-name` is ESM from v2 on, and
	// this module is also loaded by a test whose jest `vm` cannot require one.
	const colorName =
		/** @type {{ default: ColorNameTable }} */
		(await import("color-name")).default;

	assertGrammarsParse();
	assertPrimitivesExist();

	const boxShorthands = collectBoxShorthands(false);
	const slashShorthands = collectBoxShorthands(true);
	const boxLonghands = collectBoxLonghands([
		...boxShorthands,
		...slashShorthands
	]);
	const colorFunctions = collectColorArgumentFunctions();
	const colorNames = collectColorNames(colorName);
	const mathFunctions = collectMathFunctions();
	const substitutionFunctions = collectSubstitutionFunctions();
	const nthPseudoFunctions = collectNthPseudoFunctions();
	const nthNamedEquivalents = collectNthNamedEquivalents();
	const omittableInitialKeywords = collectOmittableInitialKeywords();
	const selectorFunctions = collectSelectorFunctions();
	const canonicalNames = collectCanonicalNames();
	const colorOnlyProperties = collectColorOnlyProperties();
	const keywordOnlyProperties = collectKeywordOnlyProperties();
	const initialValueKeywords = collectInitialValueKeywords();
	const repeatStyleProperties = collectRepeatStyleProperties();
	const repeatStyleKeywords = collectRepeatStyleKeywords();
	// An unquoted generic is the generic rather than a family with that name, so
	// a quoted family spelled like one keeps its quotes.
	const genericFontFamilies = collectAlternationKeywords(["generic-family"]);
	// The `font` size slot, and the two slots of a `transition` that are spelled
	// as a keyword rather than a time or a function.
	const fontSizeKeywords = collectAlternationKeywords([
		"absolute-size",
		"relative-size"
	]);
	const easingKeywords = collectAlternationKeywords(["easing-function"]);
	// Every gradient function whose flow a `<side-or-corner>`/angle states, so
	// the direction it already runs in can be dropped.
	const linearGradientFunctions = [...definitions.keys()]
		.filter((name) => /^(?:repeating-)?linear-gradient\(\)$/.test(name))
		.map((name) => name.slice(0, -2))
		.sort();
	const transitionBehaviors = collectAlternationKeywords([
		"transition-behavior-value"
	]);
	const displayShortForms = collectDisplayShortForms();
	const positionProperties = [
		...new Set([
			...collectPositionProperties(),
			...collectSpelledPositionProperties()
		])
	].sort();
	const [positionXKeywords, positionYKeywords] = collectPositionKeywordAxes();
	checkStatedClassSpellings(syntaxes);
	const shorthandInitialKeywords = collectShorthandInitialKeywords();
	const shadowProperties = collectShadowProperties();
	const mergeableAtRules = collectMergeableAtRules(atRules);
	const gradientFunctions = collectGradientFunctions(syntaxes, functions);
	const fontStretchPercentages = collectFontStretchPercentages();
	const filterFunctionOmitted = collectFilterFunctionOmitted();
	const shorterColorSpellings = collectShorterColorSpellings(
		colorNames,
		colorName
	);
	const zeroAngleFunctions = collectZeroAngleFunctions();
	const mathFunctionArity = collectMathFunctionArity(mathFunctions);
	const mathFunctionSumArguments = collectMathFunctionSumArguments(
		mathFunctions,
		mathFunctionArity
	);
	const integerProperties = collectIntegerProperties();
	const zeroUnitKeepingProperties = [
		...new Set([
			...SUPPLEMENT.zeroUnitKeepingProperties,
			...collectZeroUnitAmbiguousProperties()
		])
	].sort();
	const alphaValueProperties = collectAlphaValueProperties();
	const ratioProperties = collectRatioProperties();
	const cssModulesKeywords = collectCssModulesKeywords();
	const negativeAcceptingProperties = collectNegativeAcceptingProperties();
	const pairLonghands = collectPairLonghands();
	const oneValuePairShorthands = collectOneValuePairShorthands(pairLonghands);
	const familyLonghands = collectFamilyLonghands();
	const orderedLonghands = collectOrderedLonghands(
		SUPPLEMENT.orderedShorthands
	);
	const slashLonghands = collectSlashLonghands();
	const customIdentListProperties = collectCustomIdentListProperties();
	const unsharedLonghandKeywords = collectUnsharedLonghandKeywords([
		boxLonghands,
		pairLonghands
	]);

	// Every longhand the three merge tables can consume, so the printer can ask
	// one question of a block instead of walking all three tables.
	const mergeLonghands = new Set();
	for (const table of [
		boxLonghands,
		pairLonghands,
		familyLonghands,
		orderedLonghands,
		slashLonghands
	]) {
		for (const [, longhands] of table) {
			for (const longhand of longhands) mergeLonghands.add(longhand);
		}
	}
	const slotAccepts = new Map();
	for (const [, longhands] of familyLonghands) {
		for (const longhand of longhands) {
			slotAccepts.set(
				longhand,
				acceptedValues(/** @type {string} */ (properties[longhand].syntax))
			);
		}
	}
	// A keyword the shorthand would carry into a declaration the engine drops
	// whole is taken back out, so the merge declines rather than writing one.
	for (const [longhand, keyword] of SUPPLEMENT.unmergeableSlotKeywords) {
		const slot = slotAccepts.get(longhand);
		if (slot === undefined || !slot.keywords.delete(keyword)) {
			throw new Error(
				`unmergeableSlotKeywords: ${longhand} does not accept ${keyword}`
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
	const prefixedProperties = collectPrefixTable(bcd.css.properties, true, true);
	const prefixSpellingKeywords = collectPrefixSpellingKeywords();
	const prefixedSelectors = collectPrefixTable(bcd.css.selectors, true);
	const selectorSupport = collectSelectorSupport();
	/** @type {[string, [string, number][]][]} */
	const supportedFrom = SUPPORTED_FEATURES.map(([name, paths]) => [
		name,
		collectSupportedFrom(paths)
	]);
	const pooled = poolSupport([supportedFrom, selectorSupport]);
	const prefixedAtRules = collectPrefixTable(bcd.css["at-rules"]);
	const prefixedValues = collectPrefixedValues();
	// Built before the template so the window pool below is complete when it is
	// written; the order fixes the indices the tables name.
	const prefixedPropertiesText = prefixLiteral(prefixedProperties);
	const prefixedSelectorsText = prefixLiteral(prefixedSelectors);
	const prefixedAtRulesText = prefixLiteral(prefixedAtRules);
	const prefixedValuesText = prefixedValueLiteral(prefixedValues);
	// The window pool is complete once every table above has been written, so the
	// lists flatten here: `browser, from, to` end to end, the browser named by its
	// place in `SUPPORT_BROWSERS` rather than by 710 copies of its name.
	/** @type {number[]} */
	const windowTriples = [];
	const windowStarts = [0];
	for (const list of prefixWindows) {
		for (const [browser, from, to] of list) {
			const slot = pooled.browsers.indexOf(browser);
			if (slot === -1) {
				throw new Error(`no support profile covers \`${browser}\``);
			}
			windowTriples.push(slot, from, to);
		}
		windowStarts.push(windowTriples.length);
	}
	const steppedFunctions = SUPPLEMENT.mathFunctionFold
		.filter(([, , , , , stepped]) => stepped)
		.map(([name]) => name);

	const source = `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

// GENERATED by tooling/generate-css-data.js — do not edit.
// Sources: mdn-data ${mdnDataPackage.version}, color-name ${
		colorNamePackage.version
	}, @mdn/browser-compat-data ${bcdVersion}.

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
const BOX_SHORTHANDS = ${setLiteral(
		[...boxShorthands, ...slashShorthands].sort()
	)};

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

// The pair shorthands the target's \`placeShorthand\` ability gates, newer than
// the longhands they merge.
const PLACE_SHORTHANDS = ${setLiteral(SUPPLEMENT.placeShorthands)};

// The keywords a shorthand's longhands disagree on, so a merge writing one into
// every slot would turn a declaration the engine kept into a shorthand it drops:
// \`justify-items\` takes \`left\` and \`align-items\` does not.
const UNSHARED_LONGHAND_KEYWORDS = new Map([${unsharedLonghandKeywords
		.map(([name, keywords]) => `["${name}", ${setLiteral(keywords)}]`)
		.join(", ")}]);

// The shorthands written as an order-free \`||\` of their own longhands, each
// appearing once, in grammar order. A merge emits every value, so the only
// question is whether each parses back into the longhand it was authored on.
// prettier-ignore
const FAMILY_LONGHANDS = new Map([${familyLonghands
		.map(([name, longhands]) => `["${name}", ${JSON.stringify(longhands)}]`)
		.join(", ")}]);

// The properties whose comma-separated items take a \`<custom-ident>\`, where a
// vendor spelling is a name the engine parses rather than one it may drop — so a
// later declaration listing an earlier one's items cannot be its fallback.
const CUSTOM_IDENT_LIST_PROPERTIES = ${setLiteral(customIdentListProperties)};

// The shorthands whose grammar juxtaposes its longhands in a fixed order, so a
// merge writes every value by position rather than reading which slot takes it.
const ORDERED_LONGHANDS = new Map([${orderedLonghands
		.map(([name, longhands]) => `["${name}", ${JSON.stringify(longhands)}]`)
		.join(", ")}]);

const SLASH_LONGHANDS = new Map([${slashLonghands
		.map(([name, longhands]) => `["${name}", ${JSON.stringify(longhands)}]`)
		.join(", ")}]);

// Every longhand the three merge tables above can consume, so a block is asked
// once whether it holds anything mergeable at all. Two of them have to be
// present before any shorthand can be written, and almost no block holds one,
// which is what keeps the merge off the declarations it cannot serve.
const MERGE_LONGHANDS = ${setLiteral(lowerSorted(mergeLonghands))};

// The initial keyword each of these may drop when another component stands
// beside it: omitting the group it belongs to leaves exactly that keyword. The
// second half is every keyword that group offers — a value naming two of them
// (\`grid-auto-flow:row dense column\`) fills the slot twice and is invalid, so
// dropping the initial there would print a value the author never wrote.
/** @type {Map<string, [string, string[]]>} */
// prettier-ignore
const OMITTABLE_INITIAL_KEYWORDS = new Map([${omittableInitialKeywords
		.map(
			([name, [keyword, slot]]) =>
				`["${name}", ["${keyword}", ${JSON.stringify(slot)}]]`
		)
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

// Each An+B pseudo-class whose one-element case has a name of its own:
// \`:nth-child(1)\` is what \`:first-child\` selects, in fewer bytes.
const NTH_NAMED_EQUIVALENTS = ${mapLiteral(nthNamedEquivalents)};

// The properties taking a color and never an identifier of the author's own, so
// a named color written in one is that color and may be spelled the shortest way.
const COLOR_ONLY_PROPERTIES = ${setLiteral(colorOnlyProperties)};

// The properties whose value is keywords alone, so an identifier standing
// directly in one is a keyword rather than a name of the author's — and matches
// ASCII case-insensitively. A call's arguments are read against the function's
// own grammar, so they are not covered.
const KEYWORD_ONLY_PROPERTIES = ${setLiteral(keywordOnlyProperties)};

// Each two-keyword \`display\` -> the single keyword naming the same box.
const DISPLAY_SHORT_FORMS = new Map([
${displayShortForms
	.map(
		([pair, short]) => `\t[${JSON.stringify(pair)}, ${JSON.stringify(short)}]`
	)
	.join(",\n")}
]);

// Each property whose value is a list of shadows -> the count of lengths a
// shadow cannot go below, past which a trailing zero is already implied.
const SHADOW_PROPERTIES = ${countMapLiteral(shadowProperties)};

// Each shorthand -> the keywords one of its values may drop, each with every
// spelling its own slot takes: the slot's keywords, and each function it
// accepts written \`name()\`. A sibling out of that set means the value fills the
// slot twice, which is a declaration the engine drops.
const SHORTHAND_INITIAL_KEYWORDS = new Map([
${shorthandInitialKeywords
	.map(
		([name, entries]) =>
			`\t[${JSON.stringify(name)}, new Map([${entries
				.map(
					([keyword, siblings]) =>
						`[${JSON.stringify(keyword)}, ${setLiteral(siblings)}]`
				)
				.join(", ")}])]`
	)
	.join(",\n")}
]);

// Each \`font-stretch\` keyword -> the percentage it names, which is the same
// value in fewer bytes.
const FONT_STRETCH_PERCENTAGES = ${mapLiteral(fontStretchPercentages)};

// Each \`<filter-function>\` with an optional argument -> the amount an omitted
// one means, which is what writing that amount already says.
const FILTER_FUNCTION_OMITTED = ${mapLiteral(filterFunctionOmitted)};

// The generic font families: an unquoted one of these names the generic rather
// than a family called that, so a quoted family spelled like one keeps its quotes.
const GENERIC_FONT_FAMILIES = ${setLiteral(genericFontFamilies)};

// The \`font\` size slot's keywords: \`<absolute-size>\` and \`<relative-size>\`.
const FONT_SIZE_KEYWORDS = ${setLiteral(fontSizeKeywords)};

// The \`<easing-function>\` spellings that are a keyword rather than a function.
const EASING_KEYWORDS = ${setLiteral(easingKeywords)};

// What \`transition-behavior\` accepts, the slot of a \`transition\` that is
// neither a time, an easing nor the property name.
const TRANSITION_BEHAVIORS = ${setLiteral(transitionBehaviors)};

// The linear gradients, whose flow a \`<side-or-corner>\` or angle states.
const LINEAR_GRADIENTS = ${setLiteral(linearGradientFunctions)};

// A size whose omitted second value is \`auto\`, not the first repeated.
const AUTO_SECOND_VALUE_PROPERTIES = ${setLiteral(
		SUPPLEMENT.autoSecondValueProperties
	)};

// The direction each unprefixed linear gradient already starts from. A
// \`-webkit-\` one measures its angle the other way, so it keeps what it says.
const DEFAULT_GRADIENT_DIRECTIONS = ${setLiteral(
		SUPPLEMENT.defaultGradientDirections
	)};

// A name CSS matches ASCII case-insensitively but spells with a capital ->
// that spelling, so lowercasing a name normalizes its case without printing
// \`translatey\` or \`1q\` for what everything else writes \`translateY\` and \`1Q\`.
const CANONICAL_NAMES = ${mapLiteral(canonicalNames)};

// A transform along x only -> the pair spelling whose second component is the
// 0 the one-axis call already means.
const X_AXIS_TRANSFORMS = ${mapLiteral(SUPPLEMENT.xAxisTransforms)};

// Each gradient function -> the positions its last color stop already means, so
// writing one of them there says nothing (CSS Images 3 §3.4.3).
const GRADIENT_LAST_POSITIONS = new Map([
${gradientFunctions
	.map(
		([name, positions]) =>
			`\t[${JSON.stringify(name)}, ${setLiteral(positions)}]`
	)
	.join(",\n")}
]);

// The properties whose value is a position, where each edge keyword names the
// percentage that axis resolves to.
const POSITION_PROPERTIES = ${setLiteral(positionProperties)};

// Each keyword one axis of a \`<position>\` accepts -> the percentage it resolves
// to. A keyword both maps carry (\`center\`) names whichever axis is still free,
// and every free axis is \`50%\` anyway.
const POSITION_X_KEYWORDS = new Map([
${positionXKeywords
	.map(
		([name, percentage]) =>
			`\t[${JSON.stringify(name)}, ${JSON.stringify(percentage)}]`
	)
	.join(",\n")}
]);

const POSITION_Y_KEYWORDS = new Map([
${positionYKeywords
	.map(
		([name, percentage]) =>
			`\t[${JSON.stringify(name)}, ${JSON.stringify(percentage)}]`
	)
	.join(",\n")}
]);

// The keywords one \`<repeat-style>\` axis can be: a pair only collapses where
// both halves are one of these.
const REPEAT_STYLE_KEYWORDS = ${setLiteral(repeatStyleKeywords)};

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
${shorterColorSpellings
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

// The pseudo-classes selecting a featureless element, which matches no type or
// universal selector — so an implied \`*\` before one is what makes the selector
// match nothing, and dropping it would bring the rule to life.
const FEATURELESS_PSEUDO_CLASSES = ${setLiteral(
		SUPPLEMENT.featurelessPseudoClasses
	)};

// The properties whose zero length keeps its unit: those whose own grammar
// offers a bare number beside the length, so the unit is what picks the
// reading, and the two an engine reads its own way.
const ZERO_UNIT_KEEPING_PROPERTIES = ${setLiteral(zeroUnitKeepingProperties)};

// The properties an engine takes no \`calc()\` in, so one stays as written
// rather than folding to the value it equals.
const CALC_REJECTING_PROPERTIES = ${setLiteral(
		SUPPLEMENT.calcRejectingProperties
	)};

// The range a \`calc()\` is clamped to where the literal outside it is invalid,
// keyed by property: \`[unit, min, max]\`.
/** @type {Map<string, [string, number, number]>} */
const CLAMPED_VALUE_RANGES = new Map([${SUPPLEMENT.clampedValueRanges
		.map(([name, unit, min, max]) => `["${name}", ["${unit}", ${min}, ${max}]]`)
		.join(", ")}]);

// At-rules whose empty block is inert, so dropping it changes nothing.
const DROPPABLE_WHEN_EMPTY_AT_RULES = ${setLiteral(
		SUPPLEMENT.droppableWhenEmptyAtRules
	)};

// At-rules whose block holds rules and whose prelude states a condition, so two
// adjacent blocks with the same prelude are the one block they resolve to.
const MERGEABLE_AT_RULES = ${setLiteral(mergeableAtRules)};

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
const EIGHTH_TURN_SINE = ${numberMapLiteral(
		eighthTurnEntries(SUPPLEMENT.eighthTurnSine)
	)};

/** @type {Map<number, number>} */
const EIGHTH_TURN_COSINE = ${numberMapLiteral(
		eighthTurnEntries(eighthTurnCosine)
	)};

/** @type {Map<number, number>} */
const EIGHTH_TURN_TANGENT = ${numberMapLiteral(
		eighthTurnEntries(SUPPLEMENT.eighthTurnTangent)
	)};

// What each inverse trig function answers, as \`argument -> degrees\`, by
// inverting the table above it over that function's principal branch. Every
// other argument is transcendental and leaves the call written out.
/** @type {Map<number, number>} */
const ARC_SINE_DEGREES = ${numberMapLiteral(
		collectArcAngles(SUPPLEMENT.eighthTurnSine, -2, 2)
	)};

/** @type {Map<number, number>} */
const ARC_COSINE_DEGREES = ${numberMapLiteral(
		collectArcAngles(eighthTurnCosine, 0, 4)
	)};

/** @type {Map<number, number>} */
const ARC_TANGENT_DEGREES = ${numberMapLiteral(
		collectArcAngles(SUPPLEMENT.eighthTurnTangent, -1, 1)
	)};

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
			`\t["${name}", { read: ${read}, apply: ${apply}, result: "${result}", table: ${
				table === null ? "null" : table
			} }]`
	)
	.join(",\n")}
]);

// Properties whose grammar can reach an \`<integer>\`. Deliberately wide: a
// non-integer where an integer is expected is rounded rather than dropped
// (\`z-index: calc(1.5)\` computes to \`2\`), so this is read to refuse a rewrite,
// and one name too many costs only that rewrite.
const INTEGER_PROPERTIES = ${setLiteral(integerProperties)};

// The properties whose value is one \`<number> | <percentage>\`, where the
// percentage is the number hundredfold and the two compute to the same thing.
const ALPHA_VALUE_PROPERTIES = ${setLiteral(alphaValueProperties)};

// The properties taking a \`<ratio>\`, whose second number of \`1\` is the one an
// omitted denominator means.
const RATIO_PROPERTIES = ${setLiteral(ratioProperties)};

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
const CSS_MODULES_KEYWORD_OPTIONS = ${mapLiteral(
		cssModulesKeywords.map(([name, option]) => [name, option])
	)};

// The properties a negative value is valid on, so \`calc(-5px)\` may lose its
// parentheses there. Read to permit a rewrite, which is the opposite of
// \`INTEGER_PROPERTIES\` above: naming one property too many is a bug, naming one
// too few only costs a rewrite.
const NEGATIVE_ACCEPTING_PROPERTIES = ${setLiteral(
		negativeAcceptingProperties
	)};

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

// Prefixed constructs the minifier reads back, one table per axis, as \`name ->
// [prefix, windowList][]\`. Versions are \`major * 100000 + minor\`; a target
// browser at version V needs the prefix when \`prefixedFrom <= V < unprefixedFrom\`
// (\`NEVER\` = never unprefixed). Non-standard-only constructs are absent.
// Every window list laid end to end as \`browserSlot, prefixedFrom,
// unprefixedFrom\` triples — the slot is the browser's place in
// \`SUPPORT_BROWSERS\`, so no name is restated. A spelling names its list by
// index, and two thirds of the lists are shared.
const PREFIX_WINDOWS = new Float64Array([${windowTriples
		.map(versionLiteral)
		.join(", ")}]);

// Where each window list begins; the entry after it is where it ends.
const PREFIX_WINDOW_STARTS = new Int32Array([${windowStarts.join(", ")}]);

/** @type {Map<string, [string, number][]>} */
const PREFIXED_PROPERTIES = ${prefixedPropertiesText};

/** @type {Map<string, [string, number][]>} */
const PREFIXED_SELECTORS = ${prefixedSelectorsText};

/** @type {Map<string, [string, number][]>} */
const PREFIXED_AT_RULES = ${prefixedAtRulesText};

// The version a browser that never shipped a construct is given below, and the
// one a spelling still prefixed today is unprefixed at. Finite and a plain
// number, so both version tables hold numbers alone; far past any real version,
// and past the one Safari TP is read as.
const NEVER = ${NEVER_LITERAL};

// The browsers every support profile below covers, in the order it states them.
// A selection has an ability when every browser in it is named here and at or
// past the version its profile row gives.
/** @type {string[]} */
const SUPPORT_BROWSERS = ${JSON.stringify(pooled.browsers)};

// The versions themselves, rows of \`SUPPORT_BROWSERS.length\` laid end to end,
// one row per distinct profile: a construct names the row it reads rather than
// carrying its own copy of it. \`NEVER\` is a browser that never shipped it.
const SUPPORT_PROFILES = new Float64Array([${pooled.profiles
		.flat()
		.map(versionLiteral)
		.join(", ")}]);

/** @type {Map<string, number>} */
const SUPPORTED_FROM = ${supportLiteral(supportedFrom, pooled.indexes[0])};

// When each browser first read a pseudo-class or pseudo-element, by the spelling
// a selector carries. A pseudo missing here is one no target is known to read,
// so it never joins a selector list.
/** @type {Map<string, number>} */
const SELECTOR_SUPPORTED_FROM = ${supportLiteral(selectorSupport, pooled.indexes[1])};

// The vendor spellings of a property's own keyword values, as \`property ->
// keyword -> [spelling, [browserslistBrowser, from, to][]][]\` — \`display:flex\`
// was \`display:-webkit-flex\`, and \`width:max-content\` \`width:-moz-max-content\`.
// Only keywords the property's syntax names are here, so a function whose older
// spelling read its arguments differently is not.
/** @type {Map<string, Map<string, [string, number][]>>} */
const PREFIXED_VALUES = ${prefixedValuesText};

// The keywords a vendor spelling reads in place of the standard ones, as
// \`spelling -> standard -> legacy\` — IE 10's \`-ms-flex-pack\` reads
// \`space-around\` as \`distribute\`. Each map is the older property's whole
// grammar, so a value naming anything it does not is one that property cannot
// read and no copy is written.
/** @type {Map<string, Map<string, string>>} */
const PREFIXED_SPELLING_KEYWORDS = new Map([
${prefixSpellingKeywords
	.map(
		([spelling, keywords]) =>
			`\t["${spelling}", new Map([${keywords
				.map(([standard, legacy]) => `["${standard}", "${legacy}"]`)
				.join(", ")}])]`
	)
	.join(",\n")}
]);

module.exports.ABSOLUTE_UNIT_SCALE = ABSOLUTE_UNIT_SCALE;
module.exports.ALPHA_VALUE_PROPERTIES = ALPHA_VALUE_PROPERTIES;\nmodule.exports.ANGLE_UNITS = ANGLE_UNITS;
module.exports.ARC_COSINE_DEGREES = ARC_COSINE_DEGREES;
module.exports.ARC_SINE_DEGREES = ARC_SINE_DEGREES;
module.exports.ARC_TANGENT_DEGREES = ARC_TANGENT_DEGREES;
module.exports.AUTO_SECOND_VALUE_PROPERTIES = AUTO_SECOND_VALUE_PROPERTIES;
module.exports.BOX_FAMILY_PREFIX = BOX_FAMILY_PREFIX;
module.exports.BOX_LONGHANDS = BOX_LONGHANDS;
module.exports.BOX_SHORTHANDS = BOX_SHORTHANDS;
module.exports.CALC_REJECTING_PROPERTIES = CALC_REJECTING_PROPERTIES;\nmodule.exports.CANONICAL_NAMES = CANONICAL_NAMES;\nmodule.exports.CLAMPED_VALUE_RANGES = CLAMPED_VALUE_RANGES;\nmodule.exports.COLOR_ARGUMENT_FUNCTIONS = COLOR_ARGUMENT_FUNCTIONS;
module.exports.COLOR_KEYWORDS = COLOR_KEYWORDS;\nmodule.exports.COLOR_NAME_TO_SHORTEST = COLOR_NAME_TO_SHORTEST;\nmodule.exports.COLOR_ONLY_PROPERTIES = COLOR_ONLY_PROPERTIES;
module.exports.COMPOUND_CONTINUATIONS = COMPOUND_CONTINUATIONS;
module.exports.CSS_MODULES_KEYWORDS = CSS_MODULES_KEYWORDS;
module.exports.CSS_MODULES_KEYWORD_OPTIONS = CSS_MODULES_KEYWORD_OPTIONS;
module.exports.CSS_WIDE_KEYWORDS = CSS_WIDE_KEYWORDS;
module.exports.CUBIC_BEZIER_KEYWORDS = CUBIC_BEZIER_KEYWORDS;\nmodule.exports.CUSTOM_IDENT_LIST_PROPERTIES = CUSTOM_IDENT_LIST_PROPERTIES;\nmodule.exports.DEFAULT_GRADIENT_DIRECTIONS = DEFAULT_GRADIENT_DIRECTIONS;
module.exports.DISPLAY_SHORT_FORMS = DISPLAY_SHORT_FORMS;\nmodule.exports.DROPPABLE_WHEN_EMPTY_AT_RULES = DROPPABLE_WHEN_EMPTY_AT_RULES;
module.exports.EASING_KEYWORDS = EASING_KEYWORDS;
module.exports.EIGHTH_TURN_COSINE = EIGHTH_TURN_COSINE;
module.exports.EIGHTH_TURN_SINE = EIGHTH_TURN_SINE;
module.exports.EIGHTH_TURN_TANGENT = EIGHTH_TURN_TANGENT;
module.exports.FAMILY_LONGHANDS = FAMILY_LONGHANDS;
module.exports.FAMILY_SLOT_CLASSES = FAMILY_SLOT_CLASSES;
module.exports.FAMILY_SLOT_KEYWORDS = FAMILY_SLOT_KEYWORDS;\nmodule.exports.FEATURELESS_PSEUDO_CLASSES = FEATURELESS_PSEUDO_CLASSES;
module.exports.FILTER_FUNCTION_OMITTED = FILTER_FUNCTION_OMITTED;\nmodule.exports.FLEX_KEYWORDS = FLEX_KEYWORDS;\nmodule.exports.FONT_SIZE_KEYWORDS = FONT_SIZE_KEYWORDS;\nmodule.exports.FONT_STRETCH_PERCENTAGES = FONT_STRETCH_PERCENTAGES;
module.exports.FONT_WEIGHT_NUMBERS = FONT_WEIGHT_NUMBERS;
module.exports.GENERIC_FONT_FAMILIES = GENERIC_FONT_FAMILIES;\nmodule.exports.GRADIENT_LAST_POSITIONS = GRADIENT_LAST_POSITIONS;\nmodule.exports.INITIAL_VALUE_KEYWORDS = INITIAL_VALUE_KEYWORDS;\nmodule.exports.INTEGER_PROPERTIES = INTEGER_PROPERTIES;\nmodule.exports.KEYWORD_ONLY_PROPERTIES = KEYWORD_ONLY_PROPERTIES;
module.exports.LEGACY_PSEUDO_ELEMENTS = LEGACY_PSEUDO_ELEMENTS;
module.exports.LENGTH_ONLY_FUNCTIONS = LENGTH_ONLY_FUNCTIONS;
module.exports.LINEAR_GRADIENTS = LINEAR_GRADIENTS;
module.exports.MATH_FUNCTIONS = MATH_FUNCTIONS;
module.exports.MATH_FUNCTION_ARITY = MATH_FUNCTION_ARITY;
module.exports.MATH_FUNCTION_FOLD = MATH_FUNCTION_FOLD;
module.exports.MATH_FUNCTION_KEYWORDS = MATH_FUNCTION_KEYWORDS;
module.exports.MATH_FUNCTION_SUM_ARGUMENTS = MATH_FUNCTION_SUM_ARGUMENTS;\nmodule.exports.MERGEABLE_AT_RULES = MERGEABLE_AT_RULES;\nmodule.exports.MERGE_LONGHANDS = MERGE_LONGHANDS;
module.exports.NEGATIVE_ACCEPTING_PROPERTIES = NEGATIVE_ACCEPTING_PROPERTIES;\nmodule.exports.NEVER = NEVER;
module.exports.NTH_NAMED_EQUIVALENTS = NTH_NAMED_EQUIVALENTS;\nmodule.exports.NTH_PSEUDO_FUNCTIONS = NTH_PSEUDO_FUNCTIONS;\nmodule.exports.OMITTABLE_INITIAL_KEYWORDS = OMITTABLE_INITIAL_KEYWORDS;
module.exports.ONE_VALUE_PAIR_SHORTHANDS = ONE_VALUE_PAIR_SHORTHANDS;\nmodule.exports.ORDERED_LONGHANDS = ORDERED_LONGHANDS;
module.exports.PAIR_LONGHANDS = PAIR_LONGHANDS;\nmodule.exports.PLACE_SHORTHANDS = PLACE_SHORTHANDS;\nmodule.exports.POSITION_PROPERTIES = POSITION_PROPERTIES;\nmodule.exports.POSITION_X_KEYWORDS = POSITION_X_KEYWORDS;\nmodule.exports.POSITION_Y_KEYWORDS = POSITION_Y_KEYWORDS;
module.exports.PREFIXED_AT_RULES = PREFIXED_AT_RULES;
module.exports.PREFIXED_PROPERTIES = PREFIXED_PROPERTIES;
module.exports.PREFIXED_SELECTORS = PREFIXED_SELECTORS;
module.exports.PREFIXED_SPELLING_KEYWORDS = PREFIXED_SPELLING_KEYWORDS;
module.exports.PREFIXED_VALUES = PREFIXED_VALUES;
module.exports.PREFIX_WINDOWS = PREFIX_WINDOWS;\nmodule.exports.PREFIX_WINDOW_STARTS = PREFIX_WINDOW_STARTS;
module.exports.QUARTER_TURN_ANGLE = QUARTER_TURN_ANGLE;
module.exports.RATIO_PROPERTIES = RATIO_PROPERTIES;\nmodule.exports.REPEAT_STYLE_KEYWORDS = REPEAT_STYLE_KEYWORDS;\nmodule.exports.REPEAT_STYLE_PROPERTIES = REPEAT_STYLE_PROPERTIES;\nmodule.exports.RGB_TO_NAME = RGB_TO_NAME;
module.exports.SELECTOR_FUNCTIONS = SELECTOR_FUNCTIONS;\nmodule.exports.SELECTOR_SUPPORTED_FROM = SELECTOR_SUPPORTED_FROM;\nmodule.exports.SHADOW_PROPERTIES = SHADOW_PROPERTIES;\nmodule.exports.SHORTHAND_INITIAL_KEYWORDS = SHORTHAND_INITIAL_KEYWORDS;\nmodule.exports.SLASH_BOX_SHORTHANDS = SLASH_BOX_SHORTHANDS;\nmodule.exports.SLASH_LONGHANDS = SLASH_LONGHANDS;
module.exports.STEPPED_FUNCTIONS = STEPPED_FUNCTIONS;
module.exports.SUBSTITUTION_FUNCTIONS = SUBSTITUTION_FUNCTIONS;\nmodule.exports.SUPPORTED_FROM = SUPPORTED_FROM;\nmodule.exports.SUPPORT_BROWSERS = SUPPORT_BROWSERS;\nmodule.exports.SUPPORT_PROFILES = SUPPORT_PROFILES;\nmodule.exports.TRANSITION_BEHAVIORS = TRANSITION_BEHAVIORS;
module.exports.UNIT_CONVERSION_TARGETS = UNIT_CONVERSION_TARGETS;
module.exports.UNIT_GROUP_BASE = UNIT_GROUP_BASE;\nmodule.exports.UNSHARED_LONGHAND_KEYWORDS = UNSHARED_LONGHAND_KEYWORDS;\nmodule.exports.X_AXIS_TRANSFORMS = X_AXIS_TRANSFORMS;
module.exports.ZERO_ANGLE_FUNCTIONS = ZERO_ANGLE_FUNCTIONS;
module.exports.ZERO_UNIT_KEEPING_PROPERTIES = ZERO_UNIT_KEEPING_PROPERTIES;\n// The exact arithmetic the printer's own evaluator needs. Sorted after the\n// tables: \`import/order\` orders exports by case, uppercase first.\nmodule.exports.exactAdd = exactAdd;\nmodule.exports.exactDivide = exactDivide;\nmodule.exports.exactMultiply = exactMultiply;
`;

	const summary = `${
		boxShorthands.length + slashShorthands.length
	} box shorthands (${slashShorthands.length} with a \`/\`), ${
		colorFunctions.length
	} color functions, ${substitutionFunctions.length} substitution functions, ${
		colorNames.length
	} color names, ${integerProperties.length} integer properties, ${
		negativeAcceptingProperties.length
	} negative-accepting properties, ${
		lengthOnlyFunctions.length
	} length-only functions, ${pairLonghands.length} pair shorthands, ${
		mathFunctionArity.length
	} of ${mathFunctions.length} math functions with a readable arity, ${
		cssModulesKeywords.length
	} css modules scoped properties (${cssModulesKeywords.reduce(
		(total, [, , table]) => total + table.length,
		0
	)} keywords), ${prefixedProperties.length} prefixed properties, ${
		prefixedSelectors.length
	} prefixed selectors, ${
		prefixedAtRules.length
	} prefixed at-rules and ${prefixedValues.reduce(
		(total, [, values]) => total + values.length,
		0
	)} prefixed values over ${prefixBrowsers.length} browsers`;
	return { source, summary };
};

/**
 * Write `lib/css/data.js`, or report that it is out of date.
 * @returns {Promise<void>} when it has been written or compared
 */
const generate = async () => {
	// Required here, not at the top: `collectData` is imported by a test that runs
	// on Bun and Deno, where prettier's dynamic import fails under jest's `vm`.
	const prettier = require("prettier");

	const { source, summary } = await collectData();
	// Formatted here rather than left to `yarn fmt`, so the comparison below is
	// against what the repo actually checks in.
	return prettier
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

if (require.main === module) {
	// `generate` is async, so a failed generation has to be turned back into a
	// non-zero exit rather than left as an unhandled rejection.
	generate().catch((error) => {
		process.stderr.write(`${error.stack}\n`);
		process.exitCode = 1;
	});
}

module.exports.DATA_TARGET = TARGET;
module.exports.acceptedValues = acceptedValues;
module.exports.assertClassesArePrintable = assertClassesArePrintable;
module.exports.checkStatedClassSpellings = checkStatedClassSpellings;
module.exports.collectAlphaValueProperties = collectAlphaValueProperties;
module.exports.collectData = collectData;
module.exports.collectFamilyLonghands = collectFamilyLonghands;
module.exports.collectGradientFunctions = collectGradientFunctions;
module.exports.collectMergeableAtRules = collectMergeableAtRules;
module.exports.collectNthNamedEquivalents = collectNthNamedEquivalents;
module.exports.collectOmittableInitialKeywords =
	collectOmittableInitialKeywords;
module.exports.collectRatioProperties = collectRatioProperties;
module.exports.collectUnsharedLonghandKeywords =
	collectUnsharedLonghandKeywords;
module.exports.collectZeroUnitAmbiguousProperties =
	collectZeroUnitAmbiguousProperties;
module.exports.isPlainSupport = isPlainSupport;
module.exports.isSpelledSyntax = isSpelledSyntax;
module.exports.longhandType = longhandType;
module.exports.parseValueSyntax = parseValueSyntax;
module.exports.shorthandSlots = shorthandSlots;
module.exports.slotSpellings = slotSpellings;
module.exports.walkValueSyntax = walkValueSyntax;
