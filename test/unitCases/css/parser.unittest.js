"use strict";

const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	Field,
	Flag,
	NodeType,
	Part,
	TokenStream,
	buildSkipSet,
	normalizeUrl,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents
} = require("../../../lib/css/syntax-parser");

/**
 * @param {string} src css source
 * @returns {number[]} component value types
 */
const cvTypes = (src) => parseAListOfComponentValues(src).map((n) => n.type);

describe("CssSyntax — component values (tokenToNode)", () => {
	it("classifies each leaf token type", () => {
		/**
		 * @param {string} s source
		 * @returns {import("../../../lib/css/syntax-parser").ComponentValue} parsed component value
		 */
		const cv = (s) =>
			/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
				parseAComponentValue(s)
			);
		expect(cv("123").type).toBe(NodeType.Number);
		expect(cv("50%").type).toBe(NodeType.Percentage);
		expect(cv("10px").type).toBe(NodeType.Dimension);
		expect(cv("#id").type).toBe(NodeType.Hash);
		expect(cv('"ab"').type).toBe(NodeType.String);
		expect(cv("url(a.png)").type).toBe(NodeType.Url);
		expect(cv("foo(1)").type).toBe(NodeType.Function);
		expect(cv("[a]").type).toBe(NodeType.SimpleBlock);
		expect(cv("(a)").type).toBe(NodeType.SimpleBlock);
		expect(cv("{a}").type).toBe(NodeType.SimpleBlock);
		expect(cv("+").type).toBe(NodeType.Delim);
		expect(cv(":").type).toBe(NodeType.Colon);
		expect(cv(",").type).toBe(NodeType.Comma);
		expect(cv(";").type).toBe(NodeType.Semicolon);
		expect(cv("foo").type).toBe(NodeType.Ident);
		expect(cv(".5").type).toBe(NodeType.Number);
		expect(cv("@media").type).toBe(NodeType.AtKeyword);
	});

	it("reads every escaped spelling of `url(` as a url", () => {
		/**
		 * @param {string} s source
		 * @returns {import("../../../lib/css/syntax-parser").ComponentValue} parsed value
		 */
		const cv = (s) =>
			/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
				parseAComponentValue(s)
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
			expect(cv(`${name}(a.png)`).type).toBe(NodeType.Url);
		}
		expect(cv("\\000075\r\n\\000072\r\n\\00006d\r\n(a)").type).toBe(
			NodeType.Function
		);
	});

	it("decodes numeric token metadata", () => {
		/**
		 * @param {string} s source
		 * @returns {import("../../../lib/css/syntax-parser").NumberToken} parsed number token
		 */
		const num = (s) =>
			/** @type {import("../../../lib/css/syntax-parser").NumberToken} */ (
				parseAComponentValue(s)
			);
		const int = num("123");
		expect([int.numericValue, int.typeFlag, int.sign]).toEqual([
			123,
			"integer",
			""
		]);
		const signed = num("+1.5");
		expect([signed.numericValue, signed.typeFlag, signed.sign]).toEqual([
			1.5,
			"number",
			"+"
		]);
		expect(num("-2").sign).toBe("-");
		expect(num("1e3").typeFlag).toBe("number");
	});

	it("decodes percentage and dimension metadata", () => {
		const pct = /** @type {import("../../../lib/css/syntax-parser").PercentageToken} */ (
			parseAComponentValue("-50%")
		);
		expect([pct.numericValue, pct.sign]).toEqual([-50, "-"]);
		const dim = /** @type {import("../../../lib/css/syntax-parser").DimensionToken} */ (
			parseAComponentValue("10px")
		);
		expect([dim.numericValue, dim.unit, dim.typeFlag]).toEqual([
			10,
			"px",
			"integer"
		]);
		expect(
			/** @type {import("../../../lib/css/syntax-parser").DimensionToken} */ (
				parseAComponentValue("1.5EM")
			).unit
		).toBe("em");
	});

	it("decodes hash id vs unrestricted and url content", () => {
		expect(
			/** @type {import("../../../lib/css/syntax-parser").HashToken} */ (
				parseAComponentValue("#id")
			).typeFlag
		).toBe("id");
		expect(
			/** @type {import("../../../lib/css/syntax-parser").HashToken} */ (
				parseAComponentValue("#123")
			).typeFlag
		).toBe("unrestricted");
		const url = /** @type {import("../../../lib/css/syntax-parser").UrlToken} */ (
			parseAComponentValue("url(a.png)")
		);
		expect(url.value).toBe("a.png");
		expect("a.png").toHaveLength(url.contentEnd - url.contentStart);
	});

	it("exposes function name and nested values", () => {
		const fn = /** @type {import("../../../lib/css/syntax-parser").FunctionNode} */ (
			parseAComponentValue("calc(1 + 2)")
		);
		expect(fn.name).toBe("calc");
		expect(
			fn.value.some(
				/**
				 * @param {import("../../../lib/css/syntax-parser").ComponentValue} c component value
				 * @returns {boolean} true if the value is a Number node
				 */ (c) => c.type === NodeType.Number
			)
		).toBe(true);
	});

	it("reads declarations / childRules as null on non-rule nodes", () => {
		// Only rules populate the decl / child-rule slots; a function (or any
		// non-rule container) has no entry and must read back `null`.
		const fn = /** @type {import("../../../lib/css/syntax-parser").QualifiedRule} */ (
			/** @type {unknown} */ (parseAComponentValue("calc(1 + 2)"))
		);
		expect(fn.declarations).toBeNull();
		expect(fn.childRules).toBeNull();
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
	it("parseADeclaration parses name, value and !important", () => {
		const d = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(d.name).toBe("color");
		expect(d.important).toBe(false);
		expect(d.value.length).toBeGreaterThan(0);
		expect(
			/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
				parseADeclaration("color: red !important")
			).important
		).toBe(true);
		// The ident is matched by the value its escape spells (§5.4.6 step 6).
		expect(
			/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
				parseADeclaration("color: red !import\\61 nt")
			).important
		).toBe(true);
		expect(parseADeclaration("123")).toBeUndefined();
		expect(parseADeclaration("color red")).toBeUndefined();
		expect(parseADeclaration("color")).toBeUndefined();
		// bad declaration recovery scans past a stray `}` (non-nested)
		expect(parseADeclaration("a b}c")).toBeUndefined();
	});

	it("parseARule parses qualified rules and at-rules", () => {
		const qr = /** @type {import("../../../lib/css/syntax-parser").QualifiedRule} */ (
			parseARule("a { color: red }")
		);
		expect(qr.type).toBe(NodeType.QualifiedRule);
		expect(qr.declarations).toHaveLength(1);
		const at = /** @type {import("../../../lib/css/syntax-parser").AtRule} */ (
			parseARule('@import "x";')
		);
		expect(at.type).toBe(NodeType.AtRule);
		expect(at.name).toBe("import");
		expect(at.declarations).toBeNull();
		expect(at.blockStart).toBe(-1);
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
			/** @type {import("../../../lib/css/syntax-parser").ComponentValue} */ (
				parseAComponentValue("  a  ")
			).type
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
	});

	it("shares one empty child-rules list across rules with only declarations", () => {
		// A body with no nested rules returns the shared frozen empty list rather
		// than allocating a fresh `[]` per rule (see `_EMPTY_LIST`).
		const { rules } = parseABlocksContents("x:1;y:2", 0);
		expect(rules).toHaveLength(0);
		const ss = parseAStylesheet(".a{x:1}.b{y:2}");
		const a = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (ss.rules[0]);
		const b = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (ss.rules[1]);
		expect(a.childRules).toHaveLength(0);
		expect(a.childRules).toBe(b.childRules);
		expect(Object.isFrozen(a.childRules)).toBe(true);
	});

	it("re-parses a nested rule whose selector starts <ident><colon> as a qualified rule", () => {
		// consume-a-declaration bails on the top-level `{` (step 8 would reject
		// it) and the caller re-parses the input as a qualified rule (CSS Nesting)
		const { decls, rules } = parseABlocksContents(
			"a:hover span { color: red }"
		);
		expect(decls).toHaveLength(0);
		expect(rules).toHaveLength(1);
		const rule = /** @type {import("../../../lib/css/syntax-parser").Rule} */ (rules[0]);
		expect(rule.type).toBe(NodeType.QualifiedRule);
		expect(rule.declarations).toHaveLength(1);
	});

	it("keeps a top-level {}-block in a custom property value", () => {
		const { decls } = parseABlocksContents("--x: { a: b }; color: red");
		expect(decls).toHaveLength(2);
		expect(
			/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (decls[0]).name
		).toBe("--x");
	});

	it("parseADeclaration reads a lone {}-block as a whole value", () => {
		// §5.4.6 step 8 rejects a `{}` block only when the value holds another
		// non-whitespace token beside it. Measured in Chromium: `.a{color:{a:b}}` is a
		// declaration the grammar throws out, `.a{a:hover{color:red}}` a nested rule.
		const decl = parseADeclaration("color: { a: b }");
		expect(decl).toBeDefined();
		expect(
			/** @type {import("../../../lib/css/syntax-parser").Declaration} */ (decl).name
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
		expect(
			decls.map(
				(d) => /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (d).name
			)
		).toEqual(["color", "background"]);
	});

	it("parseAStylesheet builds nested rules and a full range", () => {
		const src = "@media screen{.a{color:red}}b{y:2}";
		const ss = parseAStylesheet(src);
		expect(ss.type).toBe(NodeType.Stylesheet);
		expect(ss.rules.map((r) => r.type)).toEqual([
			NodeType.AtRule,
			NodeType.QualifiedRule
		]);
		expect(
			/** @type {import("../../../lib/css/syntax-parser").AtRule} */ (ss.rules[0]).name
		).toBe("media");
		expect(
			/** @type {import("../../../lib/css/syntax-parser").Rule[]} */ (
				/** @type {import("../../../lib/css/syntax-parser").AtRule} */ (ss.rules[0])
					.childRules
			).map((r) => r.type)
		).toEqual([NodeType.QualifiedRule]);
		expect([ss.start, ss.end]).toEqual([0, src.length]);
	});

	it("parseAStylesheetsContents discards top-level CDO/CDC and declarations", () => {
		expect(
			parseAStylesheetsContents("<!-- a{x:1} -->").map((r) => r.type)
		).toEqual([NodeType.QualifiedRule]);
		expect(parseAStylesheetsContents("color:red")).toEqual([]);
	});

	it("accepts a pre-built TokenStream as input", () => {
		const ss = parseAStylesheet(new TokenStream("a{x:1}"));
		expect(ss.rules).toHaveLength(1);
	});
});

describe("CssSyntax — Node / Token", () => {
	it("exposes range, loc and toString over the source", () => {
		const decl = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(decl.type).toBe(NodeType.Declaration);
		expect(decl.range).toEqual([decl.start, decl.end]);
		expect(decl.toString()).toBe("color: red");
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

	it("lazily computes a token's value once", () => {
		const ident = /** @type {import("../../../lib/css/syntax-parser").Token} */ (
			parseAComponentValue("foo")
		);
		expect(ident.type).toBe(NodeType.Ident);
		expect(ident.value).toBe("foo");
		expect(ident.value).toBe("foo");
	});

	it("exposes every parseA* reader accessor", () => {
		/**
		 * @param {string} src source
		 * @returns {import("../../../lib/css/syntax-parser").Token} the component value as a token
		 */
		const tok = (src) =>
			/** @type {import("../../../lib/css/syntax-parser").Token} */ (
				parseAComponentValue(src)
			);

		// loc over the source
		const decl = /** @type {import("../../../lib/css/syntax-parser").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(decl.loc.start).toEqual({ line: 1, column: 0 });
		expect(decl.loc.end.line).toBe(1);

		// unescaped: ident escapes resolved; string drops its quotes
		expect(tok("a\\62 c").unescaped).toBe("abc");
		expect(tok('"x"').unescaped).toBe("x");

		// hash value drops the `#` prefix (raw-value slice)
		expect(tok("#id").value).toBe("id");

		// function name offsets + unescapedName
		const fn = /** @type {import("../../../lib/css/syntax-parser").FunctionNode} */ (
			parseAComponentValue("foo(1)")
		);
		expect([fn.nameStart, fn.nameEnd]).toEqual([0, 3]);
		expect(fn.unescapedName).toBe("foo");

		// simple-block opening token
		expect(
			/** @type {import("../../../lib/css/syntax-parser").SimpleBlock} */ (
				parseAComponentValue("[a]")
			).token
		).toBe("[");

		// prelude + blockEnd on a qualified rule
		const src = "a { x: 1 }";
		const rule = /** @type {import("../../../lib/css/syntax-parser").QualifiedRule} */ (
			parseARule(src)
		);
		expect(rule.prelude.length).toBeGreaterThan(0);
		expect(rule.blockEnd).toBe(src.length);
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
	const rules = (src) =>
		parseAStylesheet(src).rules.map((r) => ({
			type: r.type,
			childRules: r.childRules ? r.childRules.length : 0,
			decls: r.declarations ? r.declarations.length : 0
		}));

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
		expect(parseAStylesheet("--custom: { a:1 }").rules).toHaveLength(0);
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
		// Object-backend nodes expose fields directly (not via the SoA `A` seam).
		const valueTypes = decl.value.map((n) => n.type);
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
