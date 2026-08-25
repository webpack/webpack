"use strict";

const fs = require("fs");
const {
	DATA_TARGET,
	acceptedValues,
	assertClassesArePrintable,
	checkStatedClassSpellings,
	collectAlphaValueProperties,
	collectData,
	collectFamilyLonghands,
	collectGradientFunctions,
	collectMergeableAtRules,
	collectNthNamedEquivalents,
	collectOmittableInitialKeywords,
	collectRatioProperties,
	collectUnsharedLonghandKeywords,
	collectZeroUnitAmbiguousProperties,
	isPlainSupport,
	isSpelledSyntax,
	longhandType,
	parseValueSyntax,
	shorthandSlots,
	slotSpellings,
	walkValueSyntax
} = require("../tooling/generate-css-data");

/** @import { SyntaxNode } from "../tooling/generate-css-data" */

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
			// `mdn-data` writes a few of those bounds outside the type.
			["<length> [0,∞]", "<length [0,Infinity]>"],
			["<time> [0s,∞]", "<time [0,Infinity]>"],
			// A group of its own is still a group, however it follows a type.
			[
				"<length-percentage> [ <length-percentage> <length>? ]?",
				"seq(<length-percentage> mult[0,1]([seq(<length-percentage> mult[0,1](<length>))]))"
			],
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

		it("still finds the `<calc-sum>` argument of the one it leaves out", () => {
			// `calc-size()` is refused as a whole, so its size is reduced in place.
			// Derived from the grammar's argument order, not from its name.
			const { MATH_FUNCTION_SUM_ARGUMENTS } = require("../lib/css/data");

			expect(MATH_FUNCTION_SUM_ARGUMENTS.get("calc-size")).toEqual([1]);
			// Everything the fold already reads is left out of this table.
			expect(MATH_FUNCTION_SUM_ARGUMENTS.has("min")).toBe(false);
			expect(MATH_FUNCTION_SUM_ARGUMENTS.has("round")).toBe(false);
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
					mode: "minify"
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

	describe("acceptedValues", () => {
		it("follows a `<'property'>` reference into what that property accepts", () => {
			// Followed, not named: a slot written `<'color'>` takes a color value,
			// and would claim nothing if the reference were left as a keyword.
			const { keywords, classes } = acceptedValues("<'color'>");
			expect([...classes]).toContain("color");
			expect([...keywords]).toEqual([]);
		});

		it("accepts nothing from a syntax it cannot parse", () => {
			expect(acceptedValues("<")).toEqual({
				keywords: new Set(),
				classes: new Set()
			});
		});
	});

	describe("assertClassesArePrintable", () => {
		it("passes a slot naming a class the printer sorts values into", () => {
			expect(() =>
				assertClassesArePrintable(
					new Map([["outline-color", { classes: new Set(["color"]) }]])
				)
			).not.toThrow();
		});

		it("rejects a slot naming a class the printer has no test for", () => {
			// Such a slot would claim a value the printer never offers it, making an
			// ambiguous merge read as unambiguous.
			expect(() =>
				assertClassesArePrintable(
					new Map([["rotate", { classes: new Set(["angle"]) }]])
				)
			).toThrow("rotate accepts <angle>, which the printer cannot classify");
		});
	});

	describe("isPlainSupport", () => {
		it("reads a bare arrival as the plain spelling", () => {
			expect(isPlainSupport({ version_added: "10" })).toBe(true);
		});

		it.each([
			["a prefixed one", { version_added: "10", prefix: "-webkit-" }],
			[
				"one spelled another way",
				{ version_added: "10", alternative_name: "-webkit-box" }
			],
			["one behind a flag", { version_added: "10", flags: [{}] }],
			["one BCD later removed", { version_added: "10", version_removed: "30" }]
		])("is not %s", (_why, entry) => {
			// Support that ended is the one every reading of a BCD entry has to
			// exclude: a target past the removal no longer reads the construct.
			expect(isPlainSupport(entry)).toBe(false);
		});
	});

	describe("isSpelledSyntax", () => {
		it("spells out a group's body through the multiplier over it", () => {
			expect(isSpelledSyntax("[ red | blue ]?", new Set())).toBe(true);
		});

		it("stops at a class already on the walk", () => {
			// `<color>` reaching itself must terminate rather than recurse, and says
			// nothing new about the spelling when it does.
			expect(isSpelledSyntax("<color>", new Set(["color"]))).toBe(true);
		});

		it("does not spell out a `<'property'>` reference", () => {
			// What a property accepts is not a list of values this can write out.
			expect(isSpelledSyntax("<'width'>", new Set())).toBe(false);
		});

		it("does not spell out a class a nested one does not", () => {
			expect(isSpelledSyntax("red | [ <'width'> ]", new Set())).toBe(false);
		});

		it("spells out nothing it cannot parse", () => {
			expect(isSpelledSyntax("<", new Set())).toBe(false);
		});
	});

	describe("shorthandSlots", () => {
		it("reads the slots out of a group enclosing the whole definition", () => {
			expect(shorthandSlots("[ <'flex-grow'> || <'flex-shrink'> ]")).toEqual([
				"<'flex-grow'>",
				"<'flex-shrink'>"
			]);
		});

		it("reads none out of brackets that enclose less than the whole", () => {
			// The first `[` is not the one the last `]` closes, so the group is a term
			// of the definition rather than the definition itself.
			expect(shorthandSlots("[[a]")).toBeNull();
		});
	});

	describe("slotSpellings", () => {
		it("reports every spelling a property reference reaches", () => {
			expect([...slotSpellings("<'visibility'>")]).toEqual([
				"visible",
				"hidden",
				"collapse"
			]);
		});

		it("reports none for a slot it cannot parse", () => {
			expect([...slotSpellings("<")]).toEqual([]);
		});
	});

	describe("collectAlphaValueProperties", () => {
		it("names the properties whose whole value is that alternation", () => {
			expect(collectAlphaValueProperties()).toEqual([
				"opacity",
				"shape-image-threshold"
			]);
		});

		it("follows a name through to what states the alternation", () => {
			expect(
				collectAlphaValueProperties(
					{ a: { syntax: "<one>" } },
					{ one: { syntax: "<number> | <percentage>" } }
				)
			).toEqual(["a"]);
		});

		it("names none where the chain of names has no end", () => {
			expect(
				collectAlphaValueProperties(
					{ a: { syntax: "<one>" }, b: { syntax: "<gone>" }, c: {} },
					{ one: { syntax: "<one>" } }
				)
			).toEqual([]);
		});
	});

	describe("collectNthNamedEquivalents", () => {
		it("pairs each An+B pseudo-class with the name its one-element case has", () => {
			expect(collectNthNamedEquivalents()).toEqual([
				["nth-child", "first-child"],
				["nth-last-child", "last-child"],
				["nth-last-of-type", "last-of-type"],
				["nth-of-type", "first-of-type"]
			]);
		});
	});

	describe("collectOmittableInitialKeywords", () => {
		it("keeps only a stated keyword the property table agrees is its initial", () => {
			expect(collectOmittableInitialKeywords()).toEqual([
				["grid-auto-flow", ["row", ["column", "row"]]]
			]);
		});

		it("reads the whole slot the keyword is chosen among", () => {
			expect(
				collectOmittableInitialKeywords(["a"], {
					a: { initial: "row", syntax: "[ row | column | page ] || dense" }
				})
			).toEqual([["a", ["row", ["column", "page", "row"]]]]);
		});

		it("refuses a keyword the grammar no longer offers beside another", () => {
			expect(() =>
				collectOmittableInitialKeywords(["a"], {
					a: { initial: "row", syntax: "row | column" }
				})
			).toThrow("No omittable 'row' in 'a': row | column");
		});
	});

	describe("collectZeroUnitAmbiguousProperties", () => {
		it("names a property offering a bare number beside the length", () => {
			expect(collectZeroUnitAmbiguousProperties()).toContain("tab-size");
			expect(collectZeroUnitAmbiguousProperties()).toContain("line-height");
			expect(collectZeroUnitAmbiguousProperties()).toContain(
				"border-image-outset"
			);
		});

		it("reads only the value's own level, not what a function takes", () => {
			// `width` reaches `<number>` through the gradients `<image>` offers, and
			// none of them is something `width` could have been written as.
			expect(collectZeroUnitAmbiguousProperties()).not.toContain("width");
			expect(collectZeroUnitAmbiguousProperties()).not.toContain("margin");
		});

		it("follows a shorthand into the longhand that states the pair", () => {
			expect(
				collectZeroUnitAmbiguousProperties({
					a: { syntax: "<'b'>" },
					b: { syntax: "<number> | <length>" },
					c: { syntax: "<length>" },
					d: { syntax: "steps(<number>) | <length>" }
				})
			).toEqual(["a", "b"]);
		});
	});

	describe("collectRatioProperties", () => {
		it("names the properties whose grammar reaches a `<ratio>`", () => {
			expect(collectRatioProperties()).toEqual(["aspect-ratio"]);
		});
	});

	describe("longhandType", () => {
		it("reads the one type a longhand's whole value is", () => {
			expect(longhandType("border-top-color", 0)).toBe("color");
		});

		it("follows the `<'other'>` a longhand is stated as", () => {
			expect(
				longhandType("a", 0, {
					a: { syntax: "<'b'>" },
					b: { syntax: "<color>" }
				})
			).toBe("color");
		});

		it("reads none for a name the table does not hold", () => {
			expect(longhandType("gone", 0, {})).toBeNull();
		});

		it("reads none where the entry states no syntax", () => {
			expect(longhandType("a", 0, { a: {} })).toBeNull();
		});

		it("reads none where the chain of references has no end", () => {
			expect(longhandType("a", 0, { a: { syntax: "<'a'>" } })).toBeNull();
		});

		it("reads none where the value is more than one type", () => {
			expect(
				longhandType("a", 0, { a: { syntax: "red | <color>" } })
			).toBeNull();
		});
	});

	describe("collectUnsharedLonghandKeywords", () => {
		it("names the keywords only one half of a pair takes", () => {
			// `left` / `right` are `justify-*`'s alone and `<baseline-position>` is
			// `align-content`'s, so a shorthand carrying one is invalid whole.
			expect(
				collectUnsharedLonghandKeywords([
					[
						["place-items", ["align-items", "justify-items"]],
						["place-content", ["align-content", "justify-content"]]
					]
				])
			).toEqual([
				["place-content", ["baseline", "first", "last", "left", "right"]],
				["place-items", ["left", "legacy", "right"]]
			]);
		});

		it("leaves out a family whose longhands agree", () => {
			expect(
				collectUnsharedLonghandKeywords([
					[["overflow", ["overflow-x", "overflow-y"]]]
				])
			).toEqual([]);
		});

		it("skips a shorthand whose longhand states no grammar", () => {
			// The tables are derived, so a name `mdn-data` has no grammar for is one
			// nothing can be said about — the shorthand goes unguarded rather than
			// being read as disagreeing on every keyword.
			expect(
				collectUnsharedLonghandKeywords([
					[["place-items", ["align-items", "no-such-property"]]]
				])
			).toEqual([]);
		});
	});

	describe("collectFamilyLonghands", () => {
		it("names each shorthand's slots in grammar order", () => {
			expect(collectFamilyLonghands()).toEqual(
				expect.arrayContaining([
					[
						"border-top",
						["border-top-width", "border-top-style", "border-top-color"]
					],
					["outline", ["outline-width", "outline-style", "outline-color"]]
				])
			);
		});

		it("names them in one order whatever order the table states them in", () => {
			expect(
				collectFamilyLonghands(
					{
						b: {
							syntax: "<'b-one'> || <'b-two'>",
							computed: ["b-one", "b-two"]
						},
						a: {
							syntax: "<'a-one'> || <'a-two'>",
							computed: ["a-one", "a-two"]
						}
					},
					["a", "b"]
				)
			).toEqual([
				["a", ["a-one", "a-two"]],
				["b", ["b-one", "b-two"]]
			]);
		});

		it("names none where a slot is a keyword rather than a longhand", () => {
			expect(
				collectFamilyLonghands(
					{ a: { syntax: "none || <length>", computed: ["a-one", "a-two"] } },
					["a"]
				)
			).toEqual([]);
		});

		it("names none where a type names more than one of the longhands", () => {
			expect(
				collectFamilyLonghands(
					{
						a: { syntax: "<color> || <length>", computed: ["a-one", "a-two"] },
						"a-one": { syntax: "<color>" },
						"a-two": { syntax: "<color>" }
					},
					["a"]
				)
			).toEqual([]);
		});

		it("names none where the grammar reaches fewer slots than longhands", () => {
			expect(
				collectFamilyLonghands(
					{
						a: {
							syntax: "<'a-one'> || <'a-two'>",
							computed: ["a-one", "a-two", "a-three"]
						}
					},
					["a"]
				)
			).toEqual([]);
		});

		it("names none where the grammar is not an order-free alternation", () => {
			expect(
				collectFamilyLonghands(
					{
						a: { syntax: "<'a-one'> <'a-two'>", computed: ["a-one", "a-two"] }
					},
					["a"]
				)
			).toEqual([]);
		});

		it("names none where the grammar cannot be parsed", () => {
			expect(
				collectFamilyLonghands(
					{ a: { syntax: "<", computed: ["a-one", "a-two"] } },
					["a"]
				)
			).toEqual([]);
		});

		it("names none where the entry states no syntax or no longhands", () => {
			expect(
				collectFamilyLonghands(
					{
						a: { computed: ["a-one", "a-two"] },
						b: { syntax: "<'b-one'> || <'b-two'>" },
						c: { syntax: "<'c-one'> || <'c-two'>", computed: ["c-one"] }
					},
					["a", "b", "c"]
				)
			).toEqual([]);
		});

		it("names none for a shorthand no verified list holds", () => {
			expect(
				collectFamilyLonghands(
					{
						a: {
							syntax: "<'a-one'> || <'a-two'>",
							computed: ["a-one", "a-two"]
						}
					},
					[]
				)
			).toEqual([]);
		});

		it("names none where a slot is not one of the longhands", () => {
			expect(
				collectFamilyLonghands(
					{
						a: { syntax: "<'x'> || <'a-two'>", computed: ["a-one", "a-two"] }
					},
					["a"]
				)
			).toEqual([]);
		});
	});

	describe("the guards on what those datasets still publish", () => {
		it("accepts a `syntaxes.json` that states no class the SUPPLEMENT does", () => {
			expect(() => checkStatedClassSpellings({})).not.toThrow();
		});

		it("rejects one that has grown an entry the SUPPLEMENT states", () => {
			expect(() =>
				checkStatedClassSpellings({ url: { syntax: "<url()> | <src()>" } })
			).toThrow("`<url>` is spelled out by mdn-data now");
		});

		it("reads each gradient's last position off the stop list it names", () => {
			expect(
				collectGradientFunctions(
					{
						gradient: { syntax: "<conic-gradient()> | <linear-gradient()>" },
						"conic-gradient-syntax": { syntax: "<angular-color-stop-list>" }
					},
					{
						"conic-gradient()": { syntax: "<conic-gradient-syntax>" },
						"linear-gradient()": { syntax: "<color-stop-list>" }
					}
				)
			).toEqual([
				["conic-gradient", ["100%", "360deg", "1turn"]],
				["linear-gradient", ["100%"]]
			]);
		});

		it("reads no function out of a `<gradient>` that names none", () => {
			expect(
				collectGradientFunctions({ gradient: { syntax: "none" } }, {})
			).toEqual([]);
		});

		it("rejects a `syntaxes.json` without `<gradient>`", () => {
			expect(() => collectGradientFunctions({}, {})).toThrow(
				"`<gradient>` is gone from mdn-data"
			);
		});

		it("rejects a `functions.json` missing a call `<gradient>` names", () => {
			expect(() =>
				collectGradientFunctions(
					{ gradient: { syntax: "<linear-gradient()>" } },
					{}
				)
			).toThrow("`linear-gradient()` is gone from mdn-data");
		});

		it("rejects one whose call is there with its syntax unwritten", () => {
			expect(() =>
				collectGradientFunctions(
					{ gradient: { syntax: "<linear-gradient()>" } },
					{ "linear-gradient()": {} }
				)
			).toThrow("`linear-gradient()` is gone from mdn-data");
		});

		it("skips an at-rule whose syntax the dataset leaves unwritten", () => {
			expect(
				collectMergeableAtRules({
					"@font-face": {},
					"@keyframes": {
						syntax: "@keyframes <keyframes-name> { <rule-list> }"
					},
					"@media": { syntax: "@media <media-query-list> { <rule-list> }" }
				})
			).toEqual(["media"]);
		});

		it("rejects an `at-rules.json` without a rule replaced by name", () => {
			expect(() => collectMergeableAtRules({})).toThrow(
				"`@keyframes` is gone from mdn-data"
			);
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

			const { source } = await collectData();
			const config = await prettier.resolveConfig(DATA_TARGET);
			const formatted = await prettier.format(source, {
				...config,
				filepath: DATA_TARGET
			});
			expect(formatted).toBe(fs.readFileSync(DATA_TARGET, "utf8"));
		});

		it.each([
			[
				"a supplemented initial the dataset now states itself",
				"text-align",
				(/** @type {EXPECTED_ANY} */ entry) => {
					entry.initial = "start";
				},
				/drop it from SUPPLEMENT\.initialValueKeywords/
			],
			[
				"a slot keyword the dataset no longer accepts",
				"flex-wrap",
				(/** @type {EXPECTED_ANY} */ entry) => {
					entry.syntax = "nowrap | [ wrap | wrap-reverse ]";
				},
				/unmergeableSlotKeywords: flex-wrap does not accept balance/
			]
		])("fails generation on %s", async (_why, name, stale, message) => {
			// A `SUPPLEMENT` entry states what no dataset does; once one does, the
			// entry is stale and generation has to say so rather than emit it twice.
			const properties =
				/** @type {Record<string, { initial: string | string[], syntax: string }>} */ (
					/** @type {unknown} */ (require("mdn-data/css/properties.json"))
				);

			const entry = properties[name];
			const before = { ...entry };
			stale(entry);
			try {
				await expect(collectData()).rejects.toThrow(message);
			} finally {
				Object.assign(entry, before);
			}
			await expect(collectData()).resolves.toBeDefined();
		});
	});
});
