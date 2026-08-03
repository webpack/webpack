"use strict";

const {
	parseValueSyntax,
	walkValueSyntax
} = require("../tooling/css-value-syntax");

/** @typedef {import("../tooling/css-value-syntax").SyntaxNode} SyntaxNode */

/**
 * A one-line spelling of a parsed tree, so a case states the shape it expects
 * rather than a nested object literal.
 * @param {SyntaxNode} node the tree
 * @returns {string} its shape
 */
const shape = (node) => {
	switch (node.type) {
		case "oneOf":
			return `oneOf(${node.items.map(shape).join(" | ")})`;
		case "anyOf":
			return `anyOf(${node.items.map(shape).join(" || ")})`;
		case "allOf":
			return `allOf(${node.items.map(shape).join(" && ")})`;
		case "sequence":
			return `seq(${node.items.map(shape).join(" ")})`;
		case "multiplier":
			return `mult[${node.min},${node.max === Infinity ? "inf" : node.max}${
				node.comma ? ",comma" : ""
			}](${shape(node.body)})`;
		case "group":
			return `[${shape(node.body)}]`;
		case "parens":
			return `(${shape(node.body)})`;
		case "function":
			return `${node.name}(${node.body === null ? "" : shape(node.body)})`;
		case "type":
			return `<${node.name}${node.min === null ? "" : ` [${node.min},${node.max}]`}>`;
		case "property":
			return `<'${node.name}'>`;
		case "keyword":
			return node.name;
		case "literal":
			return JSON.stringify(node.value);
	}
};

describe("CssValueSyntax", () => {
	describe("combinator precedence (CSS Values 4 §2.5)", () => {
		it.each([
			// Loosest to tightest: `|` then `||` then `&&` then juxtaposition.
			["a | b c", "oneOf(a | seq(b c))"],
			["a b | c", "oneOf(seq(a b) | c)"],
			["a && b | c", "oneOf(allOf(a && b) | c)"],
			["a | b && c", "oneOf(a | allOf(b && c))"],
			["a || b && c", "anyOf(a || allOf(b && c))"],
			["a && b || c", "anyOf(allOf(a && b) || c)"],
			["a | b || c", "oneOf(a | anyOf(b || c))"],
			["[ a | b ] c", "seq([oneOf(a | b)] c)"]
		])("%s", (source, expected) => {
			expect(shape(parseValueSyntax(source))).toBe(expected);
		});
	});

	describe("multipliers", () => {
		it.each([
			["a?", "mult[0,1](a)"],
			["a*", "mult[0,inf](a)"],
			["a+", "mult[1,inf](a)"],
			["a#", "mult[1,inf,comma](a)"],
			["a{2}", "mult[2,2](a)"],
			["a{1,4}", "mult[1,4](a)"],
			["a{1,}", "mult[1,inf](a)"],
			["a#{3}", "mult[3,3,comma](a)"],
			// Multipliers stack: a comma list, itself optional.
			["a#?", "mult[0,1](mult[1,inf,comma](a))"],
			["[ a ]!", "mult[1,1]([a])"]
		])("%s", (source, expected) => {
			expect(shape(parseValueSyntax(source))).toBe(expected);
		});
	});

	describe("atoms", () => {
		it.each([
			["<length>", "<length>"],
			["<length [0,∞]>", "<length [0,Infinity]>"],
			["<time [0s,∞]>", "<time [0,Infinity]>"],
			["<number [-∞,1]>", "<number [-Infinity,1]>"],
			["<'margin-top'>", "<'margin-top'>"],
			// A type name may itself end in `()`.
			["<calc-size()>", "<calc-size()>"],
			// A `+` inside a name is part of it, not a multiplier.
			["<an+b>", "<an+b>"],
			["calc( <calc-sum> )", "calc(<calc-sum>)"],
			["rect()", "rect()"],
			// Literal parentheses the value carries, distinct from `[ ]` grouping.
			["( <calc-sum> )", "(<calc-sum>)"],
			["a , b", 'seq(a "," b)'],
			["a / b", 'seq(a "/" b)'],
			["[ '+' | '-' ]", '[oneOf("+" | "-")]'],
			// An at-rule prelude names its keyword with a leading `@`.
			["@top-left | @top-right", "oneOf(@top-left | @top-right)"]
		])("%s", (source, expected) => {
			expect(shape(parseValueSyntax(source))).toBe(expected);
		});

		it("keeps a block's braces apart from a repeat range", () => {
			// `{` after a space is the block, not a `{a,b}` multiplier.
			expect(shape(parseValueSyntax("<keyframe-selector># { a }"))).toBe(
				'seq(mult[1,inf,comma](<keyframe-selector>) "{" a "}")'
			);
		});
	});

	describe("the spec's calc productions", () => {
		it("keeps division to a plain number", () => {
			// CSS Values 4 §10.1 — `/` takes `<number>` and nothing else, so the
			// minifier's "decline unless the divisor is a number" is the grammar.
			expect(
				shape(
					parseValueSyntax("<calc-value> [ '*' <calc-value> | '/' <number> ]*")
				)
			).toBe(
				'seq(<calc-value> mult[0,inf]([oneOf(seq("*" <calc-value>) | seq("/" <number>))]))'
			);
		});
	});

	describe("rejections", () => {
		it.each([
			["[ a", 'expected "]"'],
			["( a", 'expected ")"'],
			["<length", 'unterminated "<"'],
			["'a", "unterminated '"],
			["a ]", 'unexpected "]"'],
			["", "empty sequence"]
		])("%s", (source, message) => {
			expect(() => parseValueSyntax(source)).toThrow(message);
		});
	});

	describe("walkValueSyntax", () => {
		it("reaches every node once, the root first", () => {
			/** @type {string[]} */
			const seen = [];
			walkValueSyntax(parseValueSyntax("[ a | <b> ]#"), (node) => {
				seen.push(node.type);
			});
			expect(seen).toEqual(["multiplier", "group", "oneOf", "keyword", "type"]);
		});

		it("reaches into a function body and stops at an empty one", () => {
			/** @type {string[]} */
			const seen = [];
			walkValueSyntax(parseValueSyntax("f(<a>) g()"), (node) => {
				seen.push(node.type);
			});
			expect(seen).toEqual(["sequence", "function", "type", "function"]);
		});
	});

	describe("the mdn-data corpus", () => {
		// The generator asserts this too, so `yarn lint:special` fails on a data
		// bump that reaches for notation the parser does not know. Repeated here
		// so the failure names the production rather than a stale table.
		it.each([
			["syntaxes", require("mdn-data/css/syntaxes.json")],
			["functions", require("mdn-data/css/functions.json")],
			["properties", require("mdn-data/css/properties.json")],
			["at-rules", require("mdn-data/css/at-rules.json")]
		])("parses every %s entry", (_name, data) => {
			/** @type {string[]} */
			const failed = [];
			for (const [name, entry] of Object.entries(
				/** @type {{ [key: string]: { syntax?: string } }} */ (data)
			)) {
				if (typeof entry.syntax !== "string" || entry.syntax === "") continue;
				try {
					parseValueSyntax(entry.syntax);
				} catch (err) {
					failed.push(`${name}: ${/** @type {Error} */ (err).message}`);
				}
			}
			expect(failed).toEqual([]);
		});
	});

	describe("the arity read off those grammars", () => {
		const { MATH_FUNCTIONS, MATH_FUNCTION_ARITY } = require("../lib/css/data");

		it("counts each math function's `<calc-sum>` arguments", () => {
			expect(MATH_FUNCTION_ARITY.get("calc")).toEqual([1, 1]);
			expect(MATH_FUNCTION_ARITY.get("min")).toEqual([1, Infinity]);
			expect(MATH_FUNCTION_ARITY.get("max")).toEqual([1, Infinity]);
			expect(MATH_FUNCTION_ARITY.get("clamp")).toEqual([3, 3]);
			expect(MATH_FUNCTION_ARITY.get("atan2")).toEqual([2, 2]);
			// `log( <calc-sum>, <calc-sum>? )` — the second one is optional.
			expect(MATH_FUNCTION_ARITY.get("log")).toEqual([1, 2]);
		});

		it("leaves out the ones whose arguments are not all expressions", () => {
			// `round()` leads with a rounding strategy and `calc-size()` with a
			// basis, so neither can be evaluated by counting `<calc-sum>`s.
			expect(MATH_FUNCTION_ARITY.has("round")).toBe(false);
			expect(MATH_FUNCTION_ARITY.has("calc-size")).toBe(false);
		});

		it("never names a function the spec's math set does not", () => {
			// The arity table is read to decide whether a function may be folded, so
			// it has to stay a subset of the functions the grammars call math ones.
			for (const name of MATH_FUNCTION_ARITY.keys()) {
				expect(MATH_FUNCTIONS.has(name)).toBe(true);
			}
		});
	});
});
