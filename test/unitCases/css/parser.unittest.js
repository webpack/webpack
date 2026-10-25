"use strict";

const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	A,
	buildSkipSet,
	Field,
	Flag,
	NodeType,
	_propertyIdOf,
	normalizeUrl,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents,
	Part,
	readToken,
	TokenStream
} = require("../../../lib/css/syntax-parser");

/**
 * @param {string} src css source
 * @returns {number[]} component value types
 */
const cvTypes = (src) =>
	parseAListOfComponentValues(src).map((n) => A.type(n));

describe("CssSyntax — component values (tokenToNode)", () => {
	it("classifies each leaf token type", () => {
		/**
		 * @param {string} s source
		 * @returns {number} the parsed component value's type
		 */
		const cv = (s) =>
			A.type(
				/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
					parseAComponentValue(s)
				)
			);
		expect(cv("123")).toBe(NodeType.Number);
		expect(cv("50%")).toBe(NodeType.Percentage);
		expect(cv("10px")).toBe(NodeType.Dimension);
		expect(cv("#id")).toBe(NodeType.Hash);
		expect(cv('"ab"')).toBe(NodeType.String);
		expect(cv("url(a.png)")).toBe(NodeType.Url);
		expect(cv("foo(1)")).toBe(NodeType.Function);
		expect(cv("[a]")).toBe(NodeType.SimpleBlock);
		expect(cv("(a)")).toBe(NodeType.SimpleBlock);
		expect(cv("{a}")).toBe(NodeType.SimpleBlock);
		expect(cv("+")).toBe(NodeType.Delim);
		expect(cv(":")).toBe(NodeType.Colon);
		expect(cv(",")).toBe(NodeType.Comma);
		expect(cv(";")).toBe(NodeType.Semicolon);
		expect(cv("foo")).toBe(NodeType.Ident);
		expect(cv(".5")).toBe(NodeType.Number);
		expect(cv("@media")).toBe(NodeType.AtKeyword);
	});

	it("reads every escaped spelling of `url(` as a url", () => {
		/**
		 * @param {string} s source
		 * @returns {number} the parsed value's type
		 */
		const cv = (s) =>
			A.type(
				/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
					parseAComponentValue(s)
				)
			);
		// Longest spelling: each code point as `\` + 6 hex digits + CRLF.
		for (const name of [
			"url",
			"URL",
			"\\75 rl",
			"\\000075rl",
			"\\000075\\000072\\00006c",
			"\\000075\n\\000072\n\\00006c\n",
			"\\000075\r\n\\000072\r\n\\00006c\r\n"
		]) {
			expect(cv(`${name}(a.png)`)).toBe(NodeType.Url);
		}
		expect(cv("\\000075\r\n\\000072\r\n\\00006d\r\n(a)")).toBe(
			NodeType.Function
		);
	});

	/**
	 * @param {string} s source
	 * @returns {import("../../../lib/css/syntax-parser").ComponentValue} its one component value
	 */
	const one = (s) =>
		/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
			parseAComponentValue(s)
		);

	it("decodes numeric token metadata", () => {
		const int = one("123");
		expect([A.value(int), A.flag(Flag.integer, int)]).toEqual([123, true]);
		const signed = one("+1.5");
		expect([A.value(signed), A.flag(Flag.integer, signed)]).toEqual([
			1.5,
			false
		]);
		expect(A.value(one("-2"))).toBe(-2);
		expect(A.flag(Flag.integer, one("1e3"))).toBe(false);
	});

	it("decodes percentage and dimension metadata", () => {
		expect(A.value(one("-50%"))).toBe(-50);
		const dim = one("10px");
		expect([A.value(dim), A.name(dim), A.flag(Flag.integer, dim)]).toEqual([
			10,
			"px",
			true
		]);
		expect(A.name(one("1.5EM"))).toBe("EM");
	});

	it("decodes hash id vs unrestricted and url content", () => {
		expect(A.flag(Flag.id, one("#id"))).toBe(true);
		expect(A.flag(Flag.id, one("#123"))).toBe(false);
		const url = one("url(a.png)");
		expect(A.value(url)).toBe("a.png");
		expect(A.rangeOf(Part.value, url)).toEqual([4, 9]);
	});

	it("exposes function name and nested values", () => {
		const fn = one("calc(1 + 2)");
		expect(A.name(fn)).toBe("calc");
		expect(A.children(fn).some((c) => A.type(c) === NodeType.Number)).toBe(
			true
		);
	});

	it("reads no declarations or rules on non-rule nodes", () => {
		const fn = one("calc(1 + 2)");
		expect(A.fieldCount(Field.declarations, fn)).toBe(0);
		expect(A.fieldCount(Field.rules, fn)).toBe(0);
	});

	it("preserves stray closers, CDO and CDC as component values", () => {
		expect(cvTypes(")]}")).toEqual([
			NodeType.RightParenthesis,
			NodeType.RightSquareBracket,
			NodeType.RightCurlyBracket
		]);
		expect(cvTypes("<!---->")).toEqual([NodeType.CDO, NodeType.CDC]);
	});

	it("preserves bad-string and bad-url tokens", () => {
		expect(cvTypes('"a\nb')).toEqual([
			NodeType.BadString,
			NodeType.Whitespace,
			NodeType.Ident
		]);
		expect(cvTypes("url(a b)")).toEqual([NodeType.BadUrl]);
	});
});

describe("CssSyntax — parser entry points", () => {
	/**
	 * @param {import("../../../lib/css/syntax-parser").Node} node a rule or stylesheet
	 * @param {number} field a `Field`
	 * @returns {import("../../../lib/css/syntax-parser").Node[]} that field's items
	 */
	const items = (node, field) => {
		const out = [];
		for (let i = 0, count = A.fieldCount(field, node); i < count; i++) {
			out.push(A.field(i, field, node));
		}
		return out;
	};

	it("parseADeclaration parses name, value and !important", () => {
		const d = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(A.name(d)).toBe("color");
		expect(A.flag(Flag.important, d)).toBe(false);
		expect(A.childCount(d)).toBeGreaterThan(0);
		expect(
			A.flag(
				Flag.important,
				/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
					parseADeclaration("color: red !important")
				)
			)
		).toBe(true);
		// The ident is matched by the value its escape spells (§5.4.6 step 6).
		expect(
			A.flag(
				Flag.important,
				/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
					parseADeclaration("color: red !import\\61 nt")
				)
			)
		).toBe(true);
		expect(parseADeclaration("123")).toBeUndefined();
		expect(parseADeclaration("color red")).toBeUndefined();
		expect(parseADeclaration("color")).toBeUndefined();
		// bad declaration recovery scans past a stray `}` (non-nested)
		expect(parseADeclaration("a b}c")).toBeUndefined();
	});

	it("parseARule parses qualified rules and at-rules", () => {
		const qr = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (
			parseARule("a { color: red }")
		);
		expect(A.type(qr)).toBe(NodeType.QualifiedRule);
		expect(A.fieldCount(Field.declarations, qr)).toBe(1);
		const at = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (
			parseARule('@import "x";')
		);
		expect(A.type(at)).toBe(NodeType.AtRule);
		expect(A.name(at)).toBe("import");
		expect(A.fieldCount(Field.declarations, at)).toBe(0);
		expect(A.rangeOf(Part.block, at)).toBeNull();
	});

	it("parseARule rejects empty input and trailing rules", () => {
		expect(parseARule("")).toBeUndefined();
		expect(parseARule("   ")).toBeUndefined();
		expect(parseARule("a{} b{}")).toBeUndefined();
	});

	it("parseAComponentValue is strict about trailing input", () => {
		expect(parseAComponentValue("")).toBeUndefined();
		expect(parseAComponentValue("   ")).toBeUndefined();
		expect(parseAComponentValue("a b")).toBeUndefined();
		expect(
			A.type(
				/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
					parseAComponentValue("  a  ")
				)
			)
		).toBe(NodeType.Ident);
	});

	it("parseAListOfComponentValues keeps whitespace and all values", () => {
		expect(cvTypes("a b")).toEqual([
			NodeType.Ident,
			NodeType.Whitespace,
			NodeType.Ident
		]);
		expect(parseAListOfComponentValues("")).toEqual([]);
	});

	it("parseACommaSeparatedListOfComponentValues splits on commas", () => {
		expect(parseACommaSeparatedListOfComponentValues("a, b c, d")).toHaveLength(
			3
		);
		expect(parseACommaSeparatedListOfComponentValues("")).toEqual([]);
	});

	it("parseABlocksContents returns declarations and rules", () => {
		const { decls, rules } = parseABlocksContents("color:red;.a{x:1}", 0);
		expect(decls).toHaveLength(1);
		expect(rules).toHaveLength(1);
		expect(parseABlocksContents("x:1;y:2", 0).rules).toHaveLength(0);
	});

	it("re-parses a nested rule whose selector starts <ident><colon> as a qualified rule", () => {
		// consume-a-declaration bails on the top-level `{` (step 8 would reject
		// it) and the caller re-parses the input as a qualified rule (CSS Nesting)
		const { decls, rules } = parseABlocksContents(
			"a:hover span { color: red }"
		);
		expect(decls).toHaveLength(0);
		expect(rules).toHaveLength(1);
		expect(A.type(rules[0])).toBe(NodeType.QualifiedRule);
		expect(A.fieldCount(Field.declarations, rules[0])).toBe(1);
	});

	it("keeps a top-level {}-block in a custom property value", () => {
		const { decls } = parseABlocksContents("--x: { a: b }; color: red");
		expect(decls).toHaveLength(2);
		expect(A.name(decls[0])).toBe("--x");
	});

	it("parseADeclaration reads a lone {}-block as a whole value", () => {
		// §5.4.6 step 8 rejects a `{}` block only when the value holds another
		// non-whitespace token beside it. Measured in Chromium: `.a{color:{a:b}}` is a
		// declaration the grammar throws out, `.a{a:hover{color:red}}` a nested rule.
		const decl = parseADeclaration("color: { a: b }");
		expect(decl).toBeDefined();
		expect(
			A.name(
				/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (decl)
			)
		).toBe("color");
		// Anything beside the block sends it back to the nested-rule reading.
		expect(parseADeclaration("color: { a: b } c")).toBeUndefined();
		expect(parseADeclaration("color: { a: b } { c: d }")).toBeUndefined();
	});

	it("keeps the declaration after a lone {}-block", () => {
		// Read as a rule, the block's `}` ends it and the `;` after it goes, so
		// the declaration behind it fuses onto the block and both are lost.
		const { decls, rules } = parseABlocksContents(
			"color: { a: b }; background: red"
		);
		expect(rules).toHaveLength(0);
		expect(decls.map((d) => A.name(d))).toEqual(["color", "background"]);
	});

	it("parseAStylesheet builds nested rules and a full range", () => {
		const src = "@media screen{.a{color:red}}b{y:2}";
		const ss = parseAStylesheet(src);
		expect(A.type(ss)).toBe(NodeType.Stylesheet);
		const rules = items(ss, Field.rules);
		expect(rules.map((r) => A.type(r))).toEqual([
			NodeType.AtRule,
			NodeType.QualifiedRule
		]);
		expect(A.name(rules[0])).toBe("media");
		expect(items(rules[0], Field.rules).map((r) => A.type(r))).toEqual([
			NodeType.QualifiedRule
		]);
		expect(A.range(ss)).toEqual([0, src.length]);
	});

	it("parseAStylesheetsContents discards top-level CDO/CDC and declarations", () => {
		expect(
			parseAStylesheetsContents("<!-- a{x:1} -->").map((r) => A.type(r))
		).toEqual([NodeType.QualifiedRule]);
		expect(parseAStylesheetsContents("color:red")).toEqual([]);
	});

	it("accepts a pre-built TokenStream as input", () => {
		const ss = parseAStylesheet(new TokenStream("a{x:1}"));
		expect(A.fieldCount(Field.rules, ss)).toBe(1);
	});

	it("returns refs valid until the next parse", () => {
		const first = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(A.name(first)).toBe("color");
		parseADeclaration("margin: 0");
		expect(A.name(first)).toBe("margin");
	});
});

describe("CssSyntax — parseError callback", () => {
	/** @typedef {[string, string, import("../../../lib/css/syntax-parser").ParseErrorSeverity]} ReportedError */

	/**
	 * @param {(input: string, pos: number, options: import("../../../lib/css/syntax-parser").CssParseOptions) => unknown} parse entry point
	 * @param {string} css input
	 * @returns {ReportedError[]} code, the source it spans and severity per error
	 */
	const collect = (parse, css) => {
		/** @type {ReportedError[]} */
		const errors = [];
		parse(css, 0, {
			parseError: (input, code, start, end, severity) => {
				errors.push([code, input.slice(start, end), severity]);
			}
		});
		return errors;
	};

	it.each([
		["/* open", [["eof-in-comment", "", "error"]]],
		['a{b:"open', [["eof-in-string", "", "error"]]],
		['a{b:"open\\', [["eof-in-string", "", "error"]]],
		['a{b:"x\n}', [["newline-in-string", "\n", "warning"]]],
		["a{b:url(x", [["eof-in-url", "", "error"]]],
		["a{b:url(x  ", [["eof-in-url", "", "error"]]],
		['a{b:url(x"y)}', [["unexpected-character-in-url", '"', "warning"]]],
		["a{b:url(x\\\ny)}", [["invalid-escape", "\\", "warning"]]],
		[
			"a{b:url(x\\",
			[
				["eof-in-escape", "\\", "error"],
				["eof-in-url", "", "error"]
			]
		],
		["a{b:\\\n}", [["invalid-escape", "\\", "warning"]]],
		["a", [["eof-in-qualified-rule", "", "error"]]],
		[
			'a"x',
			[
				["eof-in-string", "", "error"],
				["eof-in-qualified-rule", "", "error"]
			]
		],
		["a}b{}", [["unexpected-right-curly-bracket", "}", "warning"]]],
		[".x{a }", [["unexpected-right-curly-bracket", "}", "warning"]]],
		[".x{a;b:c}", [["missing-qualified-rule-block", ";", "warning"]]],
		["a{b:c}", []]
	])("reports %j", (css, expected) => {
		expect(collect(parseAStylesheet, css)).toEqual(expected);
	});

	it("reports a stray } in a list of component values", () => {
		expect(collect(parseAListOfComponentValues, "a}b")).toEqual([
			["unexpected-right-curly-bracket", "}", "warning"]
		]);
	});

	it("reports an error once when a backtracked span re-tokenizes", () => {
		// The declaration fails on its `{}` value and the span re-parses as a rule.
		expect(collect(parseAStylesheet, '.x{a:"q\n{}}')).toEqual([
			["newline-in-string", "\n", "warning"]
		]);
	});

	it.each([
		["parseAStylesheetsContents", parseAStylesheetsContents, 'a{b:"x'],
		["parseABlocksContents", parseABlocksContents, 'b:"x'],
		["parseARule", parseARule, 'a{b:"x'],
		["parseADeclaration", parseADeclaration, 'b:"x'],
		["parseAComponentValue", parseAComponentValue, '"x'],
		["parseAListOfComponentValues", parseAListOfComponentValues, '"x'],
		[
			"parseACommaSeparatedListOfComponentValues",
			parseACommaSeparatedListOfComponentValues,
			'a,"x'
		]
	])("%s forwards the callback", (name, parse, css) => {
		expect(collect(parse, css)).toEqual([["eof-in-string", "", "error"]]);
	});

	it("stops reporting once the parse returns", () => {
		const parseError = jest.fn();
		parseAStylesheet("a{}", 0, { parseError });
		readToken(
			'"x',
			0,
			/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ ({})
		);
		parseAStylesheet('"x');
		expect(parseError).not.toHaveBeenCalled();
	});
});

describe("CssSyntax — Node / Token", () => {
	it("exposes range, loc and source over the input", () => {
		const decl = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(A.type(decl)).toBe(NodeType.Declaration);
		expect(A.range(decl)).toEqual([A.start(decl), A.end(decl)]);
		expect(A.source(decl)).toBe("color: red");
		expect(A.loc(decl)).toEqual([1, 0, 1, 10]);
	});

	it("computes 1-based line / 0-based column via loc", () => {
		/** @type {[number, number, number, number] | undefined} */
		let loc;
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => (loc = path.loc())
			})
			.process("a{\n  color: red\n}");
		expect(loc).toEqual([2, 2, 3, 0]);
	});

	it("ranges a declaration's value without its `!important`", () => {
		const src = "a{color: RED !important;--empty:;b:x y}";
		/** @type {string[]} */
		const values = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					const range = path.rangeOf(Part.value);
					values.push(range === null ? "none" : src.slice(range[0], range[1]));
				}
			})
			.process(src);
		expect(values).toEqual(["RED", "none", "x y"]);
	});

	it("numbers a declaration's property by what it means", () => {
		/** @type {Record<string, number>} */
		const ids = {};
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					const id = _propertyIdOf(path.node);
					// A second read hands back what the first looked up.
					expect(_propertyIdOf(path.node)).toBe(id);
					ids[A.source(path.node).split(":")[0]] = id;
				}
			})
			.process(
				"a{color:1;COLOR:1;c\\6flor:1;word-wrap:1;overflow-wrap:1;" +
					"-webkit-transition:1;transition:1;--x:1;\\2d-y:1;foo:1;é:1;" +
					"value:1;gab:1}"
			);
		expect(ids.color).toBeGreaterThanOrEqual(0);
		expect(ids.COLOR).toBe(ids.color);
		expect(ids["c\\6flor"]).toBe(ids.color);
		expect(ids["word-wrap"]).toBe(ids["overflow-wrap"]);
		expect(ids["-webkit-transition"]).toBe(ids.transition);
		expect(ids.transition).not.toBe(ids.color);
		expect(ids["--x"]).toBe(-1);
		expect(ids["\\2d-y"]).toBe(-1);
		expect(ids.foo).toBe(-2);
		expect(ids["é"]).toBe(-2);
		// These two probe past a known name, of another length and of the same.
		expect(ids.value).toBe(-2);
		expect(ids.gab).toBe(-2);
	});

	it("reads names, values and parts through A", () => {
		/**
		 * @param {string} src source
		 * @returns {import("../../../lib/css/syntax-parser").ComponentValue} its one component value
		 */
		const one = (src) =>
			/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
				parseAComponentValue(src)
			);

		// value: ident escapes resolved; a string drops its quotes, a hash its `#`
		expect(A.value(one("a\\62 c"))).toBe("abc");
		expect(A.value(one('"x"'))).toBe("x");
		expect(A.value(one("#id"))).toBe("id");

		// a function's name and where it is written
		const fn = one("foo(1)");
		expect(A.rangeOf(Part.name, fn)).toEqual([0, 3]);
		expect(A.name(fn)).toBe("foo");

		// a simple block's value is its opening bracket
		expect(A.value(one("[a]"))).toBe("[");

		// a qualified rule's prelude and block
		const src = "a { x: 1 }";
		const rule = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (
			parseARule(src)
		);
		expect(A.childCount(rule)).toBeGreaterThan(0);
		expect(A.endOf(Part.block, rule)).toBe(src.length);
	});
});

describe("CssSyntax — substitution span searches", () => {
	const { _hasSubstitutionInSpan } = require("../../../lib/css/syntax-parser");

	it.each(["", ";last:var(--x)"])(
		"shares one search across values without calls before %s",
		(suffix) => {
			expect.assertions(2);
			const css = `a{one:1;two:2;three:3${suffix}}`;
			const spans = ["one:1", "two:2", "three:3"].map((declaration) => [
				css.indexOf(declaration),
				declaration.length
			]);
			new SourceProcessor()
				.use({
					[NodeType.QualifiedRule]: () => {
						const search = jest.spyOn(String.prototype, "indexOf");
						try {
							const results = spans.map(([from, length]) =>
								_hasSubstitutionInSpan(from, from + length)
							);
							const calls = search.mock.calls.filter(
								([value]) => value === "("
							);
							expect(results).toEqual([false, false, false]);
							expect(calls).toHaveLength(1);
						} finally {
							search.mockRestore();
						}
					}
				})
				.process(css);
		}
	);

	it("handles overlapping and backward spans after a hit or end of input", () => {
		expect.assertions(7);
		const css = "a{a:var(--x);b:calc(1px + env(safe-area-inset-top));c:0}";
		const first = css.indexOf("var");
		const second = css.indexOf("calc");
		const last = css.indexOf("c:0");
		const opening = css.indexOf("(");
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: () => {
					expect(_hasSubstitutionInSpan(first, opening)).toBe(false);
					expect(_hasSubstitutionInSpan(first, opening + 1)).toBe(true);
					expect(_hasSubstitutionInSpan(opening, opening + 1)).toBe(false);
					expect(_hasSubstitutionInSpan(second, last)).toBe(true);
					expect(_hasSubstitutionInSpan(first, second)).toBe(true);
					expect(_hasSubstitutionInSpan(last, css.length)).toBe(false);
					expect(_hasSubstitutionInSpan(second, last)).toBe(true);
				}
			})
			.process(css);
	});

	it("resets search results between stylesheets, including escaped calls", () => {
		expect.assertions(5);
		for (const { css, expected } of [
			{ css: "a{color:red}", expected: false },
			{ css: "a{color:var(--x)}", expected: true },
			{ css: "a{color:red}", expected: false },
			{ css: "a{color:v\\61r(--x)}", expected: true },
			{ css: "a{color:--theme()}", expected: true }
		]) {
			new SourceProcessor()
				.use({
					[NodeType.QualifiedRule]: () => {
						expect(_hasSubstitutionInSpan(2, css.length - 1)).toBe(expected);
					}
				})
				.process(css);
		}
	});
});

describe("CssSyntax — SourceProcessor", () => {
	describe("replacing a node", () => {
		/**
		 * @param {string} css source
		 * @param {import("../../../lib/css/syntax-parser").CssVisitorMap} visitors visitors
		 * @param {"minify" | "beautify"} mode print mode
		 * @returns {string | undefined} the printed code
		 */
		const print = (css, visitors, mode = "minify") => {
			const result = new SourceProcessor().use(visitors).process(css, { mode });
			return result && result.code;
		};

		it("prints a value token, a declaration and a rule as their replacement", () => {
			const css = "a{color:#ff0000;margin-top:1px}b{color:red}";
			expect(print(css, { [NodeType.Hash]: (path) => path.replace("blue") })).toBe(
				"a{color:blue;margin-top:1px}b{color:red}"
			);
			expect(
				print(css, {
					[NodeType.Declaration]: (path) => {
						if (path.name() === "margin-top") path.replace("padding:2px");
					}
				})
			).toBe("a{color:red;padding:2px}b{color:red}");
			expect(
				print(css, {
					[NodeType.QualifiedRule]: (path) => {
						if (path.source().startsWith("b")) path.replace("i{x:y}");
					}
				})
			).toBe("a{color:red;margin-top:1px}i{x:y}");
			expect(
				print(
					css,
					{ [NodeType.Hash]: (path) => path.replace("blue") },
					"beautify"
				)
			).toBe("a {\ncolor: blue;\nmargin-top: 1px;\n}b {\ncolor: red;\n}");
		});

		it("removes a node, in an enter visitor too", () => {
			expect(
				print("a{color:red;top:0}", {
					[NodeType.Declaration]: {
						enter: (path) => {
							if (path.name() === "color") path.remove();
						}
					}
				})
			).toBe("a{top:0}");
		});

		it("prints what holds a replacement without the rewrites, and the rest with them", () => {
			expect(
				print("a{margin:0;margin-top:#f00}b{margin:0;margin-top:1px}", {
					[NodeType.Hash]: (path) => path.replace("1px")
				})
			).toBe("a{margin:0;margin-top:1px}b{margin:1px 0 0}");
		});

		it("composes a style attribute's declarations as they printed", () => {
			const result = new SourceProcessor()
				.use({
					[NodeType.Declaration]: (path) => {
						if (path.name() === "margin-top") path.replace("padding:0");
					}
				})
				.process(
					"margin-top:1px;margin-bottom:1px;margin-left:2px;margin-right:2px",
					{ mode: "minify", as: "block-contents" }
				);
			expect(result && result.code).toBe(
				"padding:0;margin-bottom:1px;margin-left:2px;margin-right:2px"
			);
		});

		it("leaves a comment and what follows it as written", () => {
			// A comment is read from the token stream, not printed as a node.
			expect(
				print("/*! x */a{color:red}b{top:0}", {
					[NodeType.Comment]: (path) => path.replace("/*y*/")
				})
			).toBe("/*! x */a{color:red}b{top:0}");
		});

		it("prints a rule large enough to stream as written, and what follows it too", () => {
			// Past the streaming threshold the block is written out as it is read.
			let body = "";
			for (let i = 0; i < 1800; i++) {
				body += `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
			}
			const css = `a{${body}}b{color:red}`;
			const plain = print(css, {});
			for (const event of ["enter", "exit"]) {
				expect(
					print(css, {
						[NodeType.QualifiedRule]: {
							[event]: (
								/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
							) => {
								if (path.source().startsWith("a{")) path.replace("z{q:1}");
							}
						}
					})
				).toBe(plain);
			}
		});

		it("prints a replacement in a custom property's value, the rest as written", () => {
			/** @type {import("../../../lib/css/syntax-parser").CssVisitorMap} */
			const visitors = { [NodeType.Hash]: (path) => path.replace("blue") };
			expect(print("a{--x: foo  #f00 bar(#f00) ;color:#f00}", visitors)).toBe(
				"a{--x:foo blue bar(blue);color:blue}"
			);
			expect(
				print("a{--x: foo  #f00 bar(#f00) }", visitors, "beautify")
			).toBe("a {\n--x: foo  blue bar(blue);\n}");
		});

		it("does nothing on a walk that prints nothing", () => {
			let seen = 0;
			new SourceProcessor()
				.use({
					[NodeType.Hash]: (path) => {
						seen++;
						path.replace("blue");
					}
				})
				.process("a{color:#f00}");
			expect(seen).toBe(1);
		});
	});

	it("exposes range / unescaped / type flags / setEnd / setBlockEnd on the path", () => {
		/** @type {Record<string, unknown>} */
		const seen = {};
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Hash]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.idFlag = path.flag(Flag.id);
						// `A.value` on a hash drops the `#` (raw-value slice).
						seen.hashValue = path.value();
					},
					[NodeType.Number]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.integerFlag = path.flag(Flag.integer);
					},
					[NodeType.String]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.unescaped = path.value();
					},
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => {
						seen.range = [path.range()[0], path.range()[1]];
					}
				})
			)
			.process('a { z-index: 5; content: "x"; color: #123 }');
		expect(seen.idFlag).toBe(false);
		expect(seen.integerFlag).toBe(true);
		expect(seen.hashValue).toBe("123");
		expect(seen.unescaped).toBe("x");
		expect(Array.isArray(seen.range)).toBe(true);
	});

	it("fires enter / exit visitors in source order", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.QualifiedRule]: {
						enter: () => log.push("enter"),
						exit: () => log.push("exit")
					},
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`)
				})
			)
			.process("a{color:red;width:1px}");
		expect(log).toEqual(["enter", "decl:color", "decl:width", "exit"]);
	});

	it("path.skipChildren() stops descent into a node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push("qr");
					path.skipChildren();
				},
				[NodeType.Declaration]: () => log.push("decl")
			})
			.process("a{color:red}");
		expect(log).toEqual(["qr"]);
	});

	it("recurseBlocks: false stops at top-level rules", () => {
		const count = (/** @type {boolean} */ recurseBlocks) => {
			let n = 0;
			new SourceProcessor()
				.use({ [NodeType.QualifiedRule]: () => n++ })
				.process("@media x{.a{c:1}.b{d:2}}", { recurseBlocks });
			return n;
		};
		expect(count(false)).toBe(0);
		expect(count(true)).toBe(2);
	});

	it("walks declarations inside at-rule blocks", () => {
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name())
				})
			)
			.process("@font-face{font-family:x;src:url(y)}");
		expect(names).toEqual(["font-family", "src"]);
	});

	it("use() chains and accumulates visitors per type", () => {
		let a = 0;
		let b = 0;
		const sp = new SourceProcessor()
			.use({ [NodeType.Declaration]: () => a++ })
			.use({ [NodeType.Declaration]: () => b++ });
		expect(sp).toBeInstanceOf(SourceProcessor);
		sp.process("x{a:1}");
		expect([a, b]).toEqual([1, 1]);
	});

	it("surfaces comments through the NodeType.Comment visitor", () => {
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use({ [NodeType.Declaration]: () => {} })
			.use({ [NodeType.Comment]: (path) => seen.push(path.source()) })
			.process("a{color:red/*!c*/}");
		expect(seen).toEqual(["/*!c*/"]);
	});

	it("re-shrinks the SoA buffers after a pathologically large rule", () => {
		// one top-level rule with > 64 Ki component-value nodes grows the SoA
		// buffers past the shrink threshold; the next parse must work after the
		// post-parse release re-shrinks them
		const big = `a{b:${"x ".repeat(70000)}}`;
		let idents = 0;
		new SourceProcessor()
			.use({ [NodeType.Ident]: () => idents++ })
			.process(big);
		// 70000 value idents + the selector ident
		expect(idents).toBe(70001);
		// again: the regrow-hint path must restore exactly enough capacity
		idents = 0;
		new SourceProcessor()
			.use({ [NodeType.Ident]: () => idents++ })
			.process(big);
		expect(idents).toBe(70001);
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name())
				})
			)
			.process("a{c:1}");
		expect(names).toEqual(["c"]);
	});

	it('as: "block-contents" walks a block\'s contents (style attribute)', () => {
		/** @type {string[]} */
		const names = [];
		/** @type {string[]} */
		const urls = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name()),
					[NodeType.Url]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => urls.push(/** @type {string} */ (path.value()))
				})
			)
			.process("color: red; background: url(a.png)", {
				as: "block-contents"
			});
		expect(names).toEqual(["color", "background"]);
		expect(urls).toEqual(["a.png"]);
	});

	it('the default "stylesheet" mode treats a top-level declaration as a parse error', () => {
		/** @type {string[]} */
		const names = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => names.push(path.name())
				})
			)
			.process("color: red; background: url(a.png)");
		expect(names).toEqual([]);
	});
});

describe("CssSyntax — the facade", () => {
	const syntax = require("../../../lib/css/syntax");

	it("names its two halves the way `javascript` does", () => {
		expect(typeof syntax.parser.grammar).toBe("function");
		expect(typeof syntax.printer.printer).toBe("function");
	});

	it("publishes only the two halves and the processor", () => {
		expect(Object.keys(syntax).sort()).toEqual([
			"SourceProcessor",
			"parser",
			"printer"
		]);
		expect(syntax.parser).toBe(require("../../../lib/css/syntax-parser"));
		expect(syntax.printer).toBe(require("../../../lib/css/syntax-printer"));
	});

	it("holds no printer until something prints", () => {
		const processor = new SourceProcessor();
		processor.process("a{color:red}");
		expect(processor._printer).toBeUndefined();
		expect(processor.process("a{color:red}", { mode: "minify" }).code).toBe(
			"a{color:red}"
		);
		expect(typeof processor._printer).toBe("function");
	});
});

describe("CssSyntax — nesting and error recovery", () => {
	/**
	 * @param {string} src css source
	 * @returns {{ type: number, childRules: number, decls: number }[]} top-level rule summary
	 */
	const rules = (src) => {
		const ss = parseAStylesheet(src);
		const out = [];
		for (let i = 0, count = A.fieldCount(Field.rules, ss); i < count; i++) {
			const r = A.field(i, Field.rules, ss);
			out.push({
				type: A.type(r),
				childRules: A.fieldCount(Field.rules, r),
				decls: A.fieldCount(Field.declarations, r)
			});
		}
		return out;
	};

	it("parses nested style rules and mixed declarations", () => {
		expect(rules("a{&:hover{x:1}}")[0]).toMatchObject({
			type: NodeType.QualifiedRule,
			childRules: 1
		});
		expect(rules("a{color:red;& b{y:1}}")[0]).toMatchObject({
			childRules: 1,
			decls: 1
		});
	});

	it("parses at-rules nested inside a style rule block", () => {
		expect(rules("a{@media s{b:1}}")[0].childRules).toBe(1);
		expect(rules("@media{@page}")[0]).toMatchObject({
			type: NodeType.AtRule,
			childRules: 1
		});
	});

	it("recovers from malformed nested rules and declarations", () => {
		// a qualified rule with no block, terminated by the enclosing `}`
		expect(rules("@media{.a}")[0].childRules).toBe(0);
		// bad declarations (no colon / pure garbage) are dropped, rule survives
		expect(rules("a{foo bar}")[0]).toMatchObject({ decls: 0 });
		expect(rules("a{!!!}")[0]).toMatchObject({ decls: 0 });
	});

	it("preserves stray closers in a rule prelude", () => {
		expect(rules("a}b{x:1}")[0].type).toBe(NodeType.QualifiedRule);
		expect(rules("@x}y{}")[0].type).toBe(NodeType.AtRule);
	});

	it("treats a declaration-like prelude with a block as a parse error", () => {
		// `ident :` followed by a block is not a valid qualified rule; at the top
		// level the block is consumed and the rule dropped, nested it recovers.
		expect(rules("--custom: { a:1 }")).toHaveLength(0);
		expect(rules("a{ foo: bar {c:1} }")[0].childRules).toBe(1);
		// a `--custom: { … }` nested inside a block is a custom property, not a
		// rule: it produces neither a child rule nor (with a block value) a decl.
		expect(rules("a{ --custom: {a:1} }")[0].childRules).toBe(0);
		expect(rules("a{ --foo : {a:1} }")[0].childRules).toBe(0);
	});

	it("drops bad declarations but keeps the surrounding rule", () => {
		expect(rules("a{ color }")[0].decls).toBe(0);
		expect(rules("@media{ !!! }")[0].type).toBe(NodeType.AtRule);
		expect(rules("a{ b{x:1}; }")[0].childRules).toBe(1);
	});

	it("walks into function and simple-block children of a value", () => {
		let nums = 0;
		let fns = 0;
		let blocks = 0;
		new SourceProcessor()
			.use({
				[NodeType.Number]: () => nums++,
				[NodeType.Function]: () => fns++,
				[NodeType.SimpleBlock]: () => blocks++
			})
			.process("a{width:calc(1 + 2);grid:[x] 3px}");
		expect([nums, fns, blocks]).toEqual([2, 1, 1]);
	});
});

describe("CssSyntax — skip set (CssProcessOptions.skip)", () => {
	// A bare declaration, parsed as block-contents so no selector prelude pollutes
	// the counts. Every leaf type appears both at the top level and inside `bar(…)`,
	// so one skip proves both the value-list and function-arg builders honour it.
	const VALUE_CSS =
		'p: foo 10 10px 50% #fff / "s" : , bar(9 baz #aaa 2px "t" %)';
	// Leaf types present in VALUE_CSS's value (Whitespace too, from the spaces).
	/** @type {[string, number][]} */
	const LEAF_TYPES = [
		["Ident", NodeType.Ident],
		["Number", NodeType.Number],
		["Dimension", NodeType.Dimension],
		["Percentage", NodeType.Percentage],
		["Hash", NodeType.Hash],
		["Delim", NodeType.Delim],
		["String", NodeType.String],
		["Colon", NodeType.Colon],
		["Comma", NodeType.Comma],
		["Whitespace", NodeType.Whitespace]
	];

	/**
	 * Count visited nodes per type while walking `css`.
	 * @param {string} css source
	 * @param {number[]=} skipTypes component-value node types to drop
	 * @returns {Record<number, number>} count keyed by node type
	 */
	const countByType = (css, skipTypes) => {
		/** @type {Record<number, number>} */
		const counts = {};
		/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
		const map = {};
		for (const t of Object.values(NodeType)) {
			map[t] = (/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path) => {
				counts[path.type()] = (counts[path.type()] || 0) + 1;
			};
		}
		new SourceProcessor().use(map).process(css, {
			as: "block-contents",
			skip: skipTypes ? { types: buildSkipSet(skipTypes) } : undefined
		});
		return counts;
	};

	const base = countByType(VALUE_CSS);

	it("baseline (no skip) visits every leaf type in the value", () => {
		for (const [name, type] of LEAF_TYPES) {
			expect({ [name]: base[type] || 0 }).toEqual({
				[name]: expect.any(Number)
			});
			expect(base[type]).toBeGreaterThan(0);
		}
	});

	it.each(LEAF_TYPES)(
		"skips every %s leaf (value + function arg) and leaves other types untouched",
		(name, type) => {
			const counts = countByType(VALUE_CSS, [type]);
			// The skipped type is fully dropped, in both the top-level value list
			// and the nested function's arg list.
			expect(counts[type] || 0).toBe(0);
			// Every other leaf type is unaffected.
			for (const [, other] of LEAF_TYPES) {
				if (other === type) continue;
				expect(counts[other] || 0).toBe(base[other] || 0);
			}
			// Structure still parses: the declaration and its function survive.
			expect(counts[NodeType.Declaration]).toBe(base[NodeType.Declaration]);
			expect(counts[NodeType.Function]).toBe(base[NodeType.Function]);
		}
	);

	it("skipping Function drops the function and its whole arg subtree", () => {
		const counts = countByType(VALUE_CSS, [NodeType.Function]);
		expect(counts[NodeType.Function] || 0).toBe(0);
		// bar()'s args (9 baz #aaa 2px "t" %) are no longer walked, so the nested
		// leaves drop out while the top-level value leaves remain.
		expect(counts[NodeType.Ident]).toBe(1); // only top-level `foo`
		expect(counts[NodeType.Number]).toBe(1); // only top-level `10`
		expect(counts[NodeType.Declaration]).toBe(base[NodeType.Declaration]);
	});

	it("skipping SimpleBlock drops the block and its whole subtree", () => {
		// `(7 qux)` is a paren simple block holding a Number and an Ident.
		const counts = countByType("p: foo (7 qux)", [NodeType.SimpleBlock]);
		expect(counts[NodeType.SimpleBlock] || 0).toBe(0);
		expect(counts[NodeType.Number] || 0).toBe(0); // nested 7 not walked
		expect(counts[NodeType.Ident]).toBe(1); // only top-level foo, not qux
	});

	it("a combined skip set drops every listed type at once", () => {
		const counts = countByType(VALUE_CSS, [
			NodeType.Number,
			NodeType.Dimension,
			NodeType.Ident
		]);
		expect(counts[NodeType.Number] || 0).toBe(0);
		expect(counts[NodeType.Dimension] || 0).toBe(0);
		expect(counts[NodeType.Ident] || 0).toBe(0);
		// A type left out of the set is still visited.
		expect(counts[NodeType.Hash]).toBe(base[NodeType.Hash]);
	});

	it("skip.selectorPrelude drops the selector prelude but keeps the block", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`ident:${path.value()}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`)
				})
			)
			.process(".foo .bar{color:red}", {
				skip: { selectorPrelude: true }
			});
		// Selector idents (foo, bar) are never materialized; the value ident (red)
		// and the declaration still are.
		expect(log).toEqual(["decl:color", "ident:red"]);
	});

	it("skip.selectorPrelude still surfaces url() inside a selector prelude", () => {
		/** @type {string[]} */
		const urls = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Url]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => urls.push(/** @type {string} */ (path.value()))
				})
			)
			.process(":x(url(p.png)){color:red}", {
				skip: { selectorPrelude: true }
			});
		expect(urls).toEqual(["p.png"]);
	});

	it("skip.selectorPrelude recovers from a stray } in the selector prelude", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`),
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`ident:${path.value()}`)
				})
			)
			.process("}} a{color:red}", {
				skip: { selectorPrelude: true }
			});
		// Stray `}`s in the prelude are a parse error; skip mode still tracks them as
		// the disambiguation tokens, recovers, and walks the block (decl + value ident).
		expect(log).toEqual(["decl:color", "ident:red"]);
	});

	// The skip-mode prelude walk steps over the leaves it drops in bytes, so
	// every spelling that can hide the `{` it stops at has to hold it back, and
	// a `(` has to hand the name in front of it back to the tokenizer.
	describe("skip.selectorPrelude reads the same rules as a full parse", () => {
		/**
		 * What a walk sees: each rule's byte range, the declarations in it, and
		 * every url, which is all skip mode still materializes.
		 * @param {string} css source
		 * @param {boolean} skip whether to skip selector preludes
		 * @returns {string[]} the visit log
		 */
		const walk = (css, skip) => {
			/** @type {string[]} */
			const log = [];
			/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
			const map = {
				[NodeType.QualifiedRule]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => log.push(`rule:${path.range()[0]}-${path.range()[1]}`),
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => log.push(`decl:${path.name()}`),
				[NodeType.Url]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => log.push(`url:${path.value()}`)
			};
			new SourceProcessor()
				.use(map)
				.process(css, skip ? { skip: { selectorPrelude: true } } : {});
			return log;
		};

		// Each case reaches the scan, which runs only past two non-whitespace
		// tokens: `.a .b` is that prefix, and the shape under test follows it.
		// Without one the tokenizer would consume the shape as one of the two.
		/** @type {[string, string][]} */
		const CASES = [
			["a plain run of leaves", ".a .b > .c + .d ~ .e{color:red}"],
			["a string hiding the braces", '.a .b "{}" .c{color:red}'],
			["a single-quoted string", ".a .b '}' .c{color:red}"],
			["a quote hiding the brace", ".a .b '{' .c{color:red}"],
			["a brace inside an attribute block", ".a .b [data-c={]{color:red}"],
			["a comment hiding the brace", ".a .b/*{*/.c{color:red}"],
			["an escaped brace", ".a .b .c\\{d{color:red}"],
			["a function and its name", ".a .b :not(.x){color:red}"],
			["a url inside the prelude's function", ".a .b :x(url(p.png)){color:red}"],
			["an attribute block", ".a .b [data-c]{color:red}"],
			["a non-ASCII selector", ".a .b .\u65E5\u672C\u8A9E{color:red}"],
			["a stray closer in the prelude", ".a .b )] .c{color:red}"],
			["a stray brace in the prelude", ".a .b }.c{color:red}"],
			["a one-token prelude", "a{color:red}"],
			["a nested rule under a block", "a{color:red;.b .c .d{color:blue}}"],
			["a nested prelude stopped by a semicolon", "a{color:red;.b .c .d;width:1px}"],
			[
				"a nested prelude stopped by the block's brace",
				"a{color:red;.b .c .d}.e{width:1px}"
			],
			["a rule inside an at-rule", "@media screen{.a .b .c{color:red}}"],
			["a selector that reads as a declaration", "a{b:c{color:red}}"],
			["a custom-property block", "a{--x:{color:red};width:1px}"],
			["a prelude running to EOF", ".a .b .c"],
			["a NUL in the prelude", ".a .b .c\u0000d{color:red}"]
		];

		it.each(CASES)("%s", (_name, css) => {
			expect(walk(css, true)).toEqual(walk(css, false));
		});

		// A bare `url(` is the other name the scan hands back to the tokenizer, and
		// skip mode drops the token lexed there — as it always has, a url visitor
		// reaching one only through a function. The scan owes the rule boundary.
		it("reads the rule around a bare url() the prelude drops", () => {
			expect(walk(".a .b url(p.png){color:red}", true)).toEqual([
				"rule:0-27",
				"decl:color"
			]);
		});

		it("keeps a url the prelude's own function holds", () => {
			expect(walk(".a .b :x(url(p.png)){color:red}", true)).toContain(
				"url:p.png"
			);
		});
	});

	it("skip.atRulePrelude drops the at-rule prelude but keeps the block", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`at:${path.name()}`),
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`ident:${path.value()}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}`)
				})
			)
			.process("@media (min-width:9px){a{color:red}}", {
				skip: { atRulePrelude: true }
			});
		// The at-rule fires, its prelude ident (min-width) is dropped, and the
		// block (the nested rule + its declaration + value ident) is still walked.
		expect(log).toEqual(["at:media", "ident:a", "decl:color", "ident:red"]);
	});

	it("skip.atRulePrelude still surfaces url() in an at-rule prelude (@import)", () => {
		/** @type {string[]} */
		const urls = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Url]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => urls.push(/** @type {string} */ (path.value()))
				})
			)
			.process("@import url(x.css);", {
				skip: { atRulePrelude: true }
			});
		expect(urls).toEqual(["x.css"]);
	});

	it("the object backend (parseAStylesheet) ignores a prior skip and builds the full tree", () => {
		// Run a skipping stream parse first, then a full parse — the object backend
		// must reset the skip state so `parseA*` are never affected.
		new SourceProcessor()
			.use({ [NodeType.Declaration]: () => {} })
			.process("a{p:1 2px}", {
				skip: { types: buildSkipSet([NodeType.Number]) }
			});
		const decl = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("p:1 2px")
		);
		const valueTypes = A.children(decl).map((n) => A.type(n));
		expect(valueTypes).toContain(NodeType.Number);
		expect(valueTypes).toContain(NodeType.Dimension);
	});

	it("accepts skip as per-call process options", () => {
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.Number]: () => seen.push("num"),
					[NodeType.Ident]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => seen.push(/** @type {string} */ (path.value()))
				})
			)
			.process("p: 1 foo", {
				as: "block-contents",
				skip: { types: buildSkipSet([NodeType.Number]) }
			});
		// The per-call skip drops numbers.
		expect(seen).toEqual(["foo"]);
	});

	it('minifies as: "block-contents" through the list-wide transforms', () => {
		const minify = (/** @type {string} */ input) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(input, {
					mode: "minify",
					as: "block-contents"
				})
			).code;

		// The production a `style=""` holds is the one a rule's block holds, so it
		// gets the same transforms — no rule around it to put them back.
		expect(minify("top:0;right:0;bottom:0;left:0")).toBe("inset:0");
		expect(minify("color:red;color:red")).toBe("color:red");
		// Nothing follows the last declaration, so its separator carries nothing.
		expect(minify("color:  #ff0000 ;")).toBe("color:red");
		expect(minify("")).toBe("");
		// A `}` closes no block here, so it is a parse error whose bad declaration
		// runs to the next `;` — what a browser reads a `style=""` as.
		expect(minify("color:red;}color:blue")).toBe("color:red");
		expect(minify("color:red;};color:blue")).toBe("color:blue");
		// Inside a value it is a token like any other.
		expect(minify("color:red}color:blue")).toBe("color:red}color:blue");
	});

	it('maps an as: "block-contents" print to where the list starts', () => {
		const { code, map } = /** @type {{ code: string, map: EXPECTED_ANY }} */ (
			new SourceProcessor().process("color:  #ff0000", {
				mode: "minify",
				as: "block-contents",
				source: "style",
				content: "color:  #ff0000"
			})
		);

		expect(code).toBe("color:red");
		// The list prints as one piece, so it anchors as one.
		expect(map.sources).toEqual(["style"]);
		expect(map.mappings).toBe("AAAA");
	});
});

describe("CssSyntax — path accessors", () => {
	/** @import { CssPath } from "../../../lib/css/syntax-parser" */
	const SRC =
		"@media screen { .a { co\\6cor: red !important; background: url(x.png) var(--v, calc(1 + 2)); } } /* note */ .b { grid: [x] 1; }";

	it("exposes every field read on the current node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (/** @type {CssPath} */ path) => {
						log.push(`at:${path.name()}`);
						log.push(
							`atName:${path.source(.../** @type {[number, number]} */ (path.rangeOf(Part.name)))}`
						);
						log.push(`prelude:${path.childCount() > 0}`);
						log.push(
							`childRules:${path.fieldCount(Field.rules)}`
						);
						log.push(
							`decls:${path.fieldCount(Field.declarations)
							}`
						);
						log.push(`blockOpen:${SRC[/** @type {[number, number]} */ (path.rangeOf(Part.block))[0]]}`);
						log.push(`blockClose:${SRC[/** @type {[number, number]} */ (path.rangeOf(Part.block))[1] - 1]}`);
						log.push(`span:${SRC.slice(path.range()[0], path.range()[0] + 6)}`);
						log.push(`node:${path.node !== null}`);
						log.push(`parent:${path.parent}`);
					},
					[NodeType.Declaration]: (/** @type {CssPath} */ path) => {
						if (path.flag(Flag.important)) {
							log.push(
								`decl:${path.source(.../** @type {[number, number]} */ (path.rangeOf(Part.name)))}=${path.name()}`
							);
						}
					},
					[NodeType.Url]: (/** @type {CssPath} */ path) => {
						log.push(
							`url:${SRC.slice(/** @type {[number, number]} */ (path.rangeOf(Part.value))[0], /** @type {[number, number]} */ (path.rangeOf(Part.value))[1])}`
						);
					},
					[NodeType.SimpleBlock]: (/** @type {CssPath} */ path) => {
						log.push(`blockToken:${path.value()}`);
					},
					[NodeType.Function]: {
						enter: (/** @type {CssPath} */ path) => {
							if (path.name() === "var") {
								log.push(`fnChildren:${path.childCount() > 0}`);
							}
						},
						exit: (/** @type {CssPath} */ path) => {
							log.push(`fnExit:${path.name()}`);
						}
					},
					[NodeType.Comment]: {
						enter: (/** @type {CssPath} */ path) => {
							log.push(`comment:${SRC.slice(path.range()[0], path.range()[1])}`);
							log.push(`commentParent:${path.parent}`);
						},
						exit: () => log.push("commentExit")
					}
				})
			)
			.process(SRC);
		expect(log).toContain("at:media");
		expect(log).toContain("atName:media");
		expect(log).toContain("prelude:true");
		expect(log).toContain("childRules:1");
		expect(log).toContain("decls:0");
		expect(log).toContain("blockOpen:{");
		expect(log).toContain("blockClose:}");
		expect(log).toContain("blockToken:[");
		expect(log).toContain("span:@media");
		expect(log).toContain("node:true");
		expect(log).toContain("parent:null");
		expect(log).toContain("decl:co\\6cor=color");
		expect(log).toContain("url:x.png");
		expect(log).toContain("fnChildren:true");
		expect(log).toContain("fnExit:var");
		expect(log).toContain("comment:/* note */");
		expect(log).toContain("commentParent:null");
		expect(log).toContain("commentExit");
	});

	it("reads prelude and declarations of a qualified rule", () => {
		/** @type {unknown[]} */
		const out = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.QualifiedRule]: (/** @type {CssPath} */ path) => {
						out.push([
							path.childCount() > 0,
							path.fieldCount(Field.declarations),
							path.fieldCount(Field.rules)
						]);
					}
				})
			)
			.process(".b { margin: 0; }");
		expect(out).toEqual([[true, 1, 0]]);
	});
});

describe("CssSyntax — normalizeUrl", () => {
	it("should return a plain url unchanged", () => {
		const s = "./images/photo.png";
		expect(normalizeUrl(s, false)).toBe(s);
	});

	it("should keep data: URIs verbatim (case-insensitive) without decoding", () => {
		expect(normalizeUrl("data:image/png;base64,AA%2F", false)).toBe(
			"data:image/png;base64,AA%2F"
		);
		expect(normalizeUrl("DATA:text/plain,x%41", false)).toBe(
			"DATA:text/plain,x%41"
		);
	});

	it("should trim whitespace, strip escaped newlines and decode escapes", () => {
		expect(normalizeUrl("  img.png\t ", true)).toBe("img.png");
		expect(normalizeUrl("im\\\ng.png", true)).toBe("img.png");
		expect(normalizeUrl("./im\\61 ges/a.png", false)).toBe("./images/a.png");
	});

	it("should decode percent-encoding outside data: URIs", () => {
		expect(normalizeUrl("./%2E/img.png", false)).toBe("././img.png");
	});
});

describe("CssSyntax — SourceProcessor without visitors", () => {
	it("streams a stylesheet through the recycle-only sink", () => {
		// Zero registered buckets: the grammar consumes with `_recycleTopLevel`
		// (no walk); nested rules exercise the per-top-level buffer recycling.
		expect(() =>
			new SourceProcessor()
				.use({})
				.process(
					".a { color: red; } @media (min-width: 1px) { .b { margin: 0 } }"
				)
		).not.toThrow();
	});
});

// cspell:ignore amespace rtant
describe("CssSyntax — §5 parsing algorithms", () => {
	/**
	 * @param {number} node a node
	 * @param {number} field which of its fields
	 * @returns {number[]} the field's items
	 */
	const items = (node, field) => {
		const out = [];
		for (let i = 0, n = A.fieldCount(field, node); i < n; i++) {
			out.push(A.field(i, field, node));
		}
		return out;
	};
	/**
	 * @param {number} node a node
	 * @param {number} field which of its fields
	 * @returns {string} the field's items' source, joined
	 */
	const text = (node, field) =>
		items(node, field)
			.map((n) => A.source(n))
			.join("");
	/**
	 * @param {string} src css source
	 * @returns {string[]} each top-level rule as `prelude{decl,…|child,…}`
	 */
	const outline = (src) =>
		items(parseAStylesheet(src), Field.rules).map(
			(r) =>
				`${text(r, Field.prelude)}{${items(r, Field.declarations)
					.map((d) => `${A.name(d)}=${text(d, Field.value)}`)
					.join(",")}|${items(r, Field.rules)
					.map((c) => text(c, Field.prelude))
					.join(",")}}`
		);

	it("parseARule returns a syntax error for a block-less qualified rule", () => {
		expect(parseARule("a")).toBeUndefined();
		expect(parseARule("  a b ")).toBeUndefined();
	});

	it("parseARule reads a block-less at-rule without a block range", () => {
		const rule = /** @type {number} */ (parseARule("@import x;"));
		expect(A.name(rule)).toBe("import");
		expect(text(rule, Field.prelude)).toBe(" x");
		expect(A.rangeOf(Part.block, rule)).toBeNull();
		expect(A.fieldCount(Field.declarations, rule)).toBe(0);
		expect(A.range(rule)).toEqual([0, 9]);
	});

	it("parseARule ends an unclosed block at end of input", () => {
		const src = "a{x:1";
		const rule = /** @type {number} */ (parseARule(src));
		expect([
			A.startOf(Part.block, rule),
			A.endOf(Part.block, rule),
			A.end(rule)
		]).toEqual([1, src.length, src.length]);
		expect(items(rule, Field.declarations).map((d) => A.source(d))).toEqual([
			"x:1"
		]);
	});

	it("parseADeclaration discards whitespace around comments before and after the colon", () => {
		const decl = /** @type {number} */ (parseADeclaration("  a/**/ :/**/ b"));
		expect(A.name(decl)).toBe("a");
		expect(items(decl, Field.value).map((n) => A.source(n))).toEqual(["b"]);
		expect(A.start(decl)).toBe(2);
	});

	it("matches `!important` on the ident's value, escapes resolved", () => {
		/**
		 * @param {string} src declaration source
		 * @returns {[boolean, string]} important flag and the value left
		 */
		const imp = (src) => {
			const decl = /** @type {number} */ (parseADeclaration(src));
			return [A.flag(Flag.important, decl), text(decl, Field.value)];
		};
		expect(imp("a:b ! IMPORTANT ")).toEqual([true, "b"]);
		expect(imp("a:b !imp\\6f rtant")).toEqual([true, "b"]);
		// The ident at end of input ends in an escape naming U+FFFD.
		expect(imp("a:b !important\\")).toEqual([false, "b !important\\"]);
		expect(imp("a:b important")).toEqual([false, "b important"]);
	});

	it("starts a qualified rule's prelude with a stray `}` or with nothing", () => {
		expect(outline("}a{x:1}")).toEqual(["}a{x=1|}"]);
		expect(outline("{x:1}")).toEqual(["{x=1|}"]);
	});

	it("drops a top-level `--name:` rule whose name is escaped (§5.4.3)", () => {
		expect(outline("--a:{x:1} b{}")).toEqual(["b{|}"]);
		expect(outline("\\2d-a:{x:1} b{}")).toEqual(["b{|}"]);
		expect(outline("-\\2d a:{x:1} b{}")).toEqual(["b{|}"]);
		// Not dashed: a rule, whatever the second code point is.
		expect(outline("-a:{x:1}")).toEqual(["-a:{x=1|}"]);
		expect(outline("-\\61 :{x:1}")).toEqual(["-\\61 :{x=1|}"]);
		expect(outline("a:{x:1}")).toEqual(["a:{x=1|}"]);
	});

	it("reads a nested `--name:` with an escaped name as a custom property (§5.4.6)", () => {
		// A custom property takes a `{}` block beside other values; any other
		// declaration does not and is re-read as a nested rule.
		expect(outline("a{\\2d-x:{b} c}")).toEqual(["a{--x={b} c|}"]);
		expect(outline("a{--x:{b} c}")).toEqual(["a{--x={b} c|}"]);
		expect(outline("a{x-:{b} c}")).toEqual(["a{|x-:}"]);
	});

	it("peeks past comments for a declaration's colon", () => {
		expect(outline("a{b/* c */:d}")).toEqual(["a{b=d|}"]);
		// Unterminated comment, and an ident running into end of input.
		expect(outline("a{b/*")).toEqual(["a{|}"]);
		expect(outline("a{b")).toEqual(["a{|}"]);
	});

	it("keeps a top-level at-rule even when its prelude holds a stray `}`", () => {
		const rules = parseAStylesheetsContents("@x } y; @z{}");
		expect(rules.map((r) => text(r, Field.prelude))).toEqual([" } y", ""]);
	});
});

describe("CssSyntax — token value decoding", () => {
	/**
	 * @param {string} src source
	 * @returns {string | number} the component value's decoded value
	 */
	const tok = (src) =>
		A.value(/** @type {number} */ (parseAComponentValue(src)));

	it("resolves ident escapes (§4.3.7)", () => {
		expect(tok("a\\:b")).toBe("a:b");
		expect(A.value(parseAListOfComponentValues("a\\:b c")[0])).toBe("a:b");
		expect(tok("a\\\\b")).toBe("a\\b");
		expect(tok("\\0 a")).toBe("�a");
		expect(tok("\\d800 a")).toBe("�a");
		expect(tok("\\110000 a")).toBe("�a");
		expect(tok("\\1F600 a")).toBe("\u{1F600}a");
		// An escape the input ran out of names U+FFFD.
		expect(tok("a\\")).toBe("a�");
		expect(tok("a\\\\")).toBe("a\\");
	});

	it("resolves string escapes and line continuations (§4.3.5)", () => {
		expect(tok('"a\\62 c"')).toBe("abc");
		expect(tok('"a\\\\b"')).toBe("a\\b");
		expect(tok('"a\\"b"')).toBe('a"b');
		expect(tok('"a\\\r\nb"')).toBe("ab");
		expect(tok('"a\\\rb"')).toBe("ab");
		expect(tok('"a\\\nb"')).toBe("ab");
		expect(tok('"a\\\fb"')).toBe("ab");
		// Unclosed at end of input: no closing quote to take off.
		expect(tok('"ab')).toBe("ab");
		expect(tok('"a\\"')).toBe('a"');
		expect(tok('"a\\')).toBe("a");
		expect(tok('"a\\\\"')).toBe("a\\");
	});

	it("resolves an at-rule name the input ran out of", () => {
		const rule = /** @type {number} */ (parseARule("@foo\\"));
		expect(A.name(rule)).toBe("foo�");
	});

	it("finds `@namespace` under any spelling before the walk", () => {
		/**
		 * @param {string} src css source
		 * @returns {string} minified
		 */
		const minify = (src) =>
			/** @type {{ code: string }} */ (
				new SourceProcessor().process(src, { mode: "minify" })
			).code;
		// An empty top-level rule is kept only where a namespace prologue may
		// still be open, which needs the source to name `@namespace` at all.
		expect(minify("@media x{}")).toBe("");
		expect(minify("@\\:x;@media x{}")).toBe("@\\:x;");
		expect(minify("@\\6e amespace x;@media x{}")).toBe(
			"@namespace x;@media x{}"
		);
		expect(minify("@NAMESPACE x;@media x{}")).toBe("@namespace x;@media x{}");
	});
});

describe("CssSyntax — path reads on every node kind", () => {
	/**
	 * Run one visitor per node type over `css`, collecting what it returns.
	 * @param {string} css source
	 * @param {Record<number, (path: import("../../../lib/css/syntax-parser").CssPath) => unknown>} reads per-type reads
	 * @param {object=} options process options
	 * @returns {unknown[]} the reads, in walk order
	 */
	const collect = (css, reads, options) => {
		/** @type {unknown[]} */
		const out = [];
		/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */
		const map = {};
		for (const [type, read] of Object.entries(reads)) {
			map[Number(type)] = (
				/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
			) => {
				out.push(read(path));
			};
		}
		new SourceProcessor().use(map).process(css, options);
		return out;
	};

	it("reads numeric values, units and integer flags", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => [
			path.value(),
			path.name(),
			path.flag(Flag.integer),
			path.rangeOf(Part.name)
		];
		expect(
			collect("a{b:10PX 1.5% -2 3e1em}", {
				[NodeType.Dimension]: read,
				[NodeType.Percentage]: read,
				[NodeType.Number]: read
			})
		).toEqual([
			[10, "PX", true, [6, 8]],
			[1.5, "", false, null],
			[-2, "", true, null],
			[30, "em", false, [20, 22]]
		]);
		// A unit the input ran out of ends in U+FFFD.
		expect(
			collect("a{b:1p\\", {
				[NodeType.Dimension]: (path) => path.name()
			})
		).toEqual(["p�"]);
	});

	it("reads names, values and flags that a node kind does not have as empty", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => [
			path.name(),
			path.value(),
			path.childCount(),
			path.children().length,
			path.flag(Flag.integer),
			path.flag(Flag.important),
			path.flag(Flag.id),
			path.rangeOf(Part.value),
			path.rangeOf(Part.block),
			path.textOf(Part.name)
		];
		expect(
			collect("a{b:c}", {
				[NodeType.Ident]: read,
				[NodeType.Declaration]: read
			})
		).toEqual([
			["", "a", 0, 0, false, false, false, null, null, null],
			["b", "", 1, 1, false, false, false, [4, 5], null, null],
			["", "c", 0, 0, false, false, false, null, null, null]
		]);
	});

	it("reads a comment's text, closed or running into end of input", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => path.value();
		expect(
			collect("/* a */a{}/* b", {
				[NodeType.QualifiedRule]: () => "rule",
				[NodeType.Comment]: read
			})
		).toEqual([" a ", "rule", " b"]);
		expect(collect("/*", { [NodeType.Comment]: read })).toEqual([""]);
	});

	it("reads a block's start and end only on a rule that has one", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => [path.startOf(Part.block), path.endOf(Part.block)];
		expect(
			collect("@x;@y{}a{}", {
				[NodeType.AtRule]: read,
				[NodeType.QualifiedRule]: read
			})
		).toEqual([
			[-1, -1],
			[5, 7],
			[8, 10]
		]);
		expect(
			collect("a{b:c}", {
				[NodeType.Ident]: (path) => [
					path.startOf(Part.block),
					path.endOf(Part.block),
					path.startOf(Part.name),
					path.endOf(Part.name),
					path.startOf(Part.value),
					path.endOf(Part.value)
				]
			})[0]
		).toEqual([-1, -1, -1, -1, -1, -1]);
		expect(
			collect("a{b:url(x)}", {
				[NodeType.Url]: (path) => [path.startOf(Part.value), path.endOf(Part.value)]
			})
		).toEqual([[8, 9]]);
	});

	it("reads an at-rule's name the input ran out of", () => {
		expect(
			collect("@foo\\", { [NodeType.AtRule]: (path) => path.name() })
		).toEqual(["foo�"]);
	});

	it("reads children, fields and fields by name", () => {
		const read = (
			/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
		) => {
			const color = path.fieldNamed(Field.declarations, "color");
			return [
				path.index,
				path.children().map((n) => path.source(n)),
				/** @type {unknown} */ (path.child(0)) !== 0 && path.source(path.child(0)),
				path.child(9),
				path.fieldCount(Field.prelude),
				path.fieldCount(Field.value),
				path.fieldCount(Field.declarations),
				path.fieldCount(Field.rules),
				path.source(path.field(0, Field.prelude)),
				/** @type {unknown} */ (path.field(0, Field.rules)) !== 0 &&
					path.source(path.field(0, Field.rules)),
				/** @type {unknown} */ (path.field(1, Field.declarations)) !== 0 &&
					path.source(path.field(1, Field.declarations)),
				path.field(-1, Field.declarations),
				path.field(5, Field.declarations),
				/** @type {unknown} */ (color) !== 0 && path.source(color),
				path.fieldNamed(Field.declarations, "nope"),
				path.source(path.node)
			];
		};
		expect(
			collect("x{} a b{width:1;color:red} c{d{}}", {
				[NodeType.QualifiedRule]: read
			})
		).toEqual([
			[0, ["x"], "x", 0, 1, 0, 0, 0, "x", false, false, 0, 0, false, 0, "x{}"],
			[
				0,
				["a", " ", "b"],
				"a",
				0,
				3,
				0,
				2,
				0,
				"a",
				false,
				"color:red",
				0,
				0,
				"color:red",
				0,
				"a b{width:1;color:red}"
			],
			[0, ["c"], "c", 0, 1, 0, 0, 1, "c", "d{}", false, 0, 0, false, 0, "c{d{}}"],
			[0, ["d"], "d", 0, 1, 0, 0, 0, "d", false, false, 0, 0, false, 0, "d{}"]
		]);
		// Below the top level, each node knows its place among its siblings.
		expect(
			collect("a{b:1;c:2;d{}}", {
				[NodeType.Declaration]: (path) => path.index,
				[NodeType.QualifiedRule]: (path) => path.index
			})
		).toEqual([0, 0, 1, 0]);
		// A leaf has no children and no fields.
		expect(
			collect("a{b:c}", {
				[NodeType.Declaration]: (path) => [
					path.fieldCount(Field.declarations, path.child(0)),
					path.children(path.child(0))
				]
			})
		).toEqual([[0, []]]);
	});

	it("stop() ends the walk once, however often it is called", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
				) => {
					log.push(path.name());
					path.stop();
					path.stop();
				}
			})
			.process("a{b:1;c:2}d{e:3}");
		expect(log).toEqual(["b"]);
	});
});

describe("CssSyntax — a skip set keeps the tree a full parse builds", () => {
	/**
	 * What a walk sees of the structure: rules, declarations and blocks.
	 * @param {string} css source
	 * @param {import("../../../lib/css/syntax-parser").SkipOptions=} skip skip options
	 * @param {"stylesheet" | "block-contents"=} as production
	 * @returns {string[]} the visit log
	 */
	const shape = (css, skip, as) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`@${path.name()}:${path.childCount()}`),
					[NodeType.QualifiedRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`rule:${path.source()}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`decl:${path.name()}:${path.childCount()}`),
					[NodeType.Function]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`fn:${path.childCount()}`)
				})
			)
			.process(css, { skip, as });
		return log;
	};
	/**
	 * @param {number[]} types node types to drop
	 * @returns {import("../../../lib/css/syntax-parser").SkipOptions} skip options
	 */
	const types = (types) => ({ types: buildSkipSet(types) });

	it.each([
		"a{div:hover{color:red}}",
		"a{b: foo {x:1}}",
		"a{b:{x:1} foo}",
		"a{b: 1 {x:1}}",
		"a{b: f() {x:1}}",
		"a{b: {x:1} }"
	])("reads %s the same with leaves dropped", (css) => {
		const full = shape(css).filter((l) => !l.startsWith("decl"));
		for (const type of [
			NodeType.Ident,
			NodeType.Number,
			NodeType.Whitespace,
			NodeType.Function
		]) {
			expect(shape(css, types([type])).filter((l) => !l.startsWith("decl"))).toEqual(
				full
			);
		}
	});

	it("drops a stray `}` from a value only when its type is skipped", () => {
		expect(shape("p: a } b", undefined, "block-contents")).toEqual(["decl:p:5"]);
		expect(
			shape("p: a } b", types([NodeType.RightCurlyBracket]), "block-contents")
		).toEqual(["decl:p:4"]);
	});

	it("drops a skipped function or block from a function's arguments", () => {
		expect(shape("p: f(g(1) (2) 3)", undefined, "block-contents")).toEqual([
			"decl:p:1",
			"fn:5",
			"fn:1"
		]);
		expect(
			shape("p: f(g(1) (2) 3)", types([NodeType.Function]), "block-contents")
		).toEqual(["decl:p:0"]);
		expect(
			shape("p: f(g(1) (2) 3)", types([NodeType.SimpleBlock]), "block-contents")
		).toEqual(["decl:p:1", "fn:4", "fn:1"]);
	});

	it("skip.atRulePrelude drops a stray `}` from a top-level at-rule's prelude", () => {
		expect(shape("@x } y;")).toEqual(["@x:4"]);
		expect(shape("@x } y;", { atRulePrelude: true })).toEqual(["@x:0"]);
	});

	it("skip.selectorPrelude still drops a top-level `--name:` rule", () => {
		const skip = { selectorPrelude: true };
		for (const css of [
			"--a:{x:1}b{}",
			"\\2d-a:{x:1}b{}",
			"--a b{x:1}",
			"a b{x:1}",
			"--a :{x:1}b{}"
		]) {
			expect(shape(css, skip)).toEqual(shape(css));
		}
		expect(shape("--a:{x:1}b{}", skip)).toEqual(["rule:b{}"]);
	});
});

describe("CssSyntax — block streaming reads the same tree", () => {
	// Comfortably past the node count a block streams its children at.
	const MANY = 3000;
	const DECLS = "c:1 2 3 4;".repeat(MANY);

	/**
	 * Each rule entered and each declaration's name, in walk order.
	 * @param {string} css source
	 * @returns {string[]} the visit log
	 */
	const walk = (css) => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../../../lib/css/syntax-parser").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`@${path.name()}`),
					[NodeType.QualifiedRule]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(`rule:${path.source(path.child(0))}`),
					[NodeType.Declaration]: (
						/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path
					) => log.push(path.name())
				})
			)
			.process(css);
		return log;
	};

	it("walks an at-rule opening a block", () => {
		expect(walk("a{@media s{b:1}}")).toEqual(["rule:a", "@media", "b"]);
	});

	it("streams a block grown on declarations after a child rule", () => {
		const log = walk(`a{b{}${DECLS}d:1}`);
		expect(log.slice(0, 3)).toEqual(["rule:a", "rule:b", "c"]);
		expect(log).toHaveLength(MANY + 3);
		expect(log[log.length - 1]).toBe("d");
	});

	it("streams the rest of a block a descendant's growth activated", () => {
		const log = walk(`a{b{${DECLS}}e{}d:1}`);
		expect(log.slice(0, 3)).toEqual(["rule:a", "rule:b", "c"]);
		expect(log.slice(-2)).toEqual(["rule:e", "d"]);
		expect(log).toHaveLength(MANY + 4);
	});

	it("streams a block grown on child rules", () => {
		const log = walk(`a{${"b c{}".repeat(MANY * 2)}d:1}`);
		expect(log).toHaveLength(MANY * 2 + 2);
		expect(log.slice(0, 2)).toEqual(["rule:a", "rule:b"]);
		expect(log[log.length - 1]).toBe("d");
	});
});

describe("CssSyntax — what a minifying print reads off the parse", () => {
	/**
	 * @param {string} css source
	 * @param {object=} options more process options
	 * @returns {string} minified
	 */
	const minify = (css, options) =>
		/** @type {{ code: string }} */ (
			new SourceProcessor().process(css, { mode: "minify", ...options })
		).code;
	// Comfortably past the node count a block streams its children at.
	const MANY = 3000;

	it("keeps input a nested block rejects, trimmed but for an escaped end", () => {
		expect(minify("a{foo;color:red}")).toBe("a{foo;color:red}");
		expect(minify("a{foo  ;color:red}")).toBe("a{foo;color:red}");
		expect(minify("a{foo\\\\ ;color:red}")).toBe("a{foo\\\\;color:red}");
		// The whitespace after a lone `\` is what keeps the `;` or `}` after it
		// from being escaped.
		expect(minify("a{foo\\ ;color:red}")).toBe("a{foo\\ ;color:red}");
		expect(minify("a{foo\\\n;color:red}")).toBe("a{foo\\\n;color:red}");
		expect(minify("a{foo\\ }b{color:red}")).toBe("a{foo\\ }b{color:red}");
	});

	it("collects a block of declarations alone for the longhand merge", () => {
		const css = `a{${"margin-top:1px;margin-right:2px;margin-bottom:3px;margin-left:4px;".repeat(MANY)}}`;
		expect(minify(css)).toBe("a{margin:1px 2px 3px 4px}");
	});

	it("holds a second block of the same named layer for the gather", () => {
		expect(minify("@layer x{a{b:c}}d{e:f}@layer x{g{h:i}}")).toBe(
			"@layer x{a{b:c}g{h:i}}d{e:f}"
		);
	});

	it("seeds the walk with the custom media and selectors read ahead of it", () => {
		expect(
			minify(
				"@media (--m){:--h{b:c}}@custom-media --m (min-width:1px);@custom-selector :--h h1;",
				{ transforms: { customMedia: true, customSelectors: true } }
			)
		).toBe("@media (width>=1px){:is(h1){b:c}}@custom-media --m (width>=1px);");
	});

	it("prints a string's escape the input ran out of as nothing", () => {
		expect(minify('a{b:"x\\')).toBe('a{b:"x"}');
	});
});
