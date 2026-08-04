"use strict";

const fs = require("fs");
const {
	DATA_TARGET,
	collectData,
	parseValueSyntax,
	walkValueSyntax
} = require("../tooling/generate-css-data");

/** @typedef {import("../tooling/generate-css-data").SyntaxNode} SyntaxNode */

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
		const {
			MATH_FUNCTIONS,
			MATH_FUNCTION_ARITY,
			MATH_FUNCTION_KEYWORDS
		} = require("../lib/css/data");

		it("counts each math function's `<calc-sum>` arguments", () => {
			expect(MATH_FUNCTION_ARITY.get("calc")).toEqual([1, 1]);
			expect(MATH_FUNCTION_ARITY.get("min")).toEqual([1, Infinity]);
			expect(MATH_FUNCTION_ARITY.get("max")).toEqual([1, Infinity]);
			expect(MATH_FUNCTION_ARITY.get("clamp")).toEqual([3, 3]);
			expect(MATH_FUNCTION_ARITY.get("atan2")).toEqual([2, 2]);
			// `log( <calc-sum>, <calc-sum>? )` — the second one is optional.
			expect(MATH_FUNCTION_ARITY.get("log")).toEqual([1, 2]);
		});

		it("reads an optional leading keyword beside the count", () => {
			// `round( <rounding-strategy>?, <calc-sum>, <calc-sum> )` — two
			// expressions, and the strategies come off `<rounding-strategy>`.
			expect(MATH_FUNCTION_ARITY.get("round")).toEqual([2, 2]);
			expect(MATH_FUNCTION_KEYWORDS.get("round")).toEqual([
				"down",
				"nearest",
				"to-zero",
				"up"
			]);
			// Nothing else in the set offers one.
			expect(MATH_FUNCTION_KEYWORDS.size).toBe(1);
		});

		it("leaves out the one whose arguments are not all expressions", () => {
			// `calc-size()` leads with a basis, which is an expression this cannot
			// evaluate by counting `<calc-sum>`s.
			expect(MATH_FUNCTION_ARITY.has("calc-size")).toBe(false);
		});

		it("only permits a negative where something states one", () => {
			// The opposite polarity to `INTEGER_PROPERTIES`: this one is read to
			// allow a rewrite, so an unannotated grammar must not reach it.
			// `<line-width>` is the case that proves it — no range, no negatives.
			const { NEGATIVE_ACCEPTING_PROPERTIES } = require("../lib/css/data");

			expect(NEGATIVE_ACCEPTING_PROPERTIES.has("margin-top")).toBe(true);
			expect(NEGATIVE_ACCEPTING_PROPERTIES.has("border-width")).toBe(false);
			expect(NEGATIVE_ACCEPTING_PROPERTIES.has("line-height")).toBe(false);
			// A shorthand deferring wholly to accepting longhands is derived...
			expect(NEGATIVE_ACCEPTING_PROPERTIES.has("margin")).toBe(true);
			expect(NEGATIVE_ACCEPTING_PROPERTIES.has("inset")).toBe(true);
			// ...and one stating lengths of its own is not.
			expect(NEGATIVE_ACCEPTING_PROPERTIES.has("padding")).toBe(false);
		});

		it("follows a shorthand into its longhands", () => {
			// `columns` names no leaf itself: it reaches `<integer>` only through
			// `<'column-count'>`, and a walk that stopped at `<'…'>` would miss it.
			const { INTEGER_PROPERTIES } = require("../lib/css/data");

			expect(INTEGER_PROPERTIES.has("columns")).toBe(true);
			expect(INTEGER_PROPERTIES.has("column-count")).toBe(true);
			expect(INTEGER_PROPERTIES.has("column-width")).toBe(false);
		});

		it("derives cosine and the inverses off the two stated tables", () => {
			const {
				ARC_COSINE_DEGREES,
				ARC_SINE_DEGREES,
				ARC_TANGENT_DEGREES,
				EIGHTH_TURN_COSINE,
				EIGHTH_TURN_SINE,
				EIGHTH_TURN_TANGENT
			} = require("../lib/css/data");

			// `cos(θ)` is `sin(θ + 90°)`, and 90° is two eighths.
			for (let eighth = 0; eighth < 8; eighth++) {
				expect(EIGHTH_TURN_COSINE.get(eighth)).toBe(
					EIGHTH_TURN_SINE.get((eighth + 2) % 8)
				);
			}
			// Each inverse is its table read back over the function's principal
			// branch, so every answer has to land on the value it came from.
			for (const [table, arc] of [
				[EIGHTH_TURN_SINE, ARC_SINE_DEGREES],
				[EIGHTH_TURN_COSINE, ARC_COSINE_DEGREES],
				[EIGHTH_TURN_TANGENT, ARC_TANGENT_DEGREES]
			]) {
				for (const [value, degrees] of arc) {
					const eighth = (((degrees / 45) % 8) + 8) % 8;
					expect(table.get(eighth)).toBe(value);
				}
			}
			expect([...ARC_SINE_DEGREES]).toEqual([
				[-1, -90],
				[0, 0],
				[1, 90]
			]);
			expect([...ARC_TANGENT_DEGREES]).toEqual([
				[-1, -45],
				[0, 0],
				[1, 45]
			]);
		});

		it("gives every folded function a descriptor the engine can drive", () => {
			// `read` and `apply` are names `lib/css/syntax.js` looks up, so a typo in
			// either would leave the function quietly unfolded rather than fail. One
			// input per descriptor is what notices.
			const { SourceProcessor } = require("../lib/css/syntax");
			const { MATH_FUNCTION_FOLD } = require("../lib/css/data");

			/** @type {{ [name: string]: [string, string] }} */
			const folds = {
				abs: ["width:abs(-5px)", "width:5px"],
				acos: ["rotate:acos(0)", "rotate:90deg"],
				asin: ["rotate:asin(1)", "rotate:90deg"],
				atan: ["rotate:atan(1)", "rotate:45deg"],
				atan2: ["rotate:atan2(1px,-1px)", "rotate:135deg"],
				clamp: ["width:clamp(1px,5px,3px)", "width:3px"],
				cos: ["width:calc(cos(0)*1px)", "width:1px"],
				exp: ["width:calc(exp(0)*1px)", "width:1px"],
				hypot: ["width:hypot(3px,4px)", "width:5px"],
				log: ["width:calc(log(8,2)*1px)", "width:3px"],
				max: ["width:max(1px,2px)", "width:2px"],
				min: ["width:min(1px,2px)", "width:1px"],
				mod: ["margin-left:mod(-7px,3px)", "margin-left:2px"],
				pow: ["width:calc(pow(2,3)*1px)", "width:8px"],
				rem: ["margin-left:rem(7px,3px)", "margin-left:1px"],
				round: ["margin-left:round(5px,2px)", "margin-left:6px"],
				sign: ["z-index:sign(5px)", "z-index:1"],
				sin: ["width:calc(sin(90deg)*1px)", "width:1px"],
				sqrt: ["width:calc(sqrt(4)*1px)", "width:2px"],
				tan: ["width:calc(tan(45deg)*1px)", "width:1px"]
			};
			expect(Object.keys(folds).sort()).toEqual([...MATH_FUNCTION_FOLD.keys()]);
			for (const [name, [input, expected]] of Object.entries(folds)) {
				const { code } = new SourceProcessor().process(`a{${input}}`, {
					minimize: true
				});
				expect(`${name}: ${code}`).toBe(`${name}: a{${expected}}`);
			}
		});

		it("never names a function the spec's math set does not", () => {
			// The arity table is read to decide whether a function may be folded, so
			// it has to stay a subset of the functions the grammars call math ones.
			for (const name of MATH_FUNCTION_ARITY.keys()) {
				expect(MATH_FUNCTIONS.has(name)).toBe(true);
			}
		});
	});

	describe("the file those tables are emitted into", () => {
		// Prettier reaches its ESM entry through a dynamic import, which the `vm`
		// shims Bun and Deno run jest on reject; `lint:special` makes the same
		// comparison on Node.
		const itNode = process.versions.bun || process.versions.deno ? it.skip : it;

		itNode("is what the generator produces from today's datasets", async () => {
			// The same comparison `yarn lint:special` makes, so a `mdn-data` bump or
			// an edited `SUPPLEMENT` fails here too rather than only in CI's lint job
			// — and every collector above runs, which is what proves them.
			const prettier = require("prettier");

			const { source } = collectData();
			const config = await prettier.resolveConfig(DATA_TARGET);
			const formatted = await prettier.format(source, {
				...config,
				filepath: DATA_TARGET
			});
			expect(formatted).toBe(fs.readFileSync(DATA_TARGET, "utf8"));
		});
	});
});
