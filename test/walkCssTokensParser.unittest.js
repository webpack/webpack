"use strict";

const {
	Node,
	NodeType,
	SourceProcessor,
	TT_BAD_STRING_TOKEN,
	TT_BAD_URL_TOKEN,
	TT_EOF,
	TT_STRING,
	TT_URL,
	Token,
	TokenStream,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents
} = require("../lib/css/walkCssTokens");

/**
 * @param {string} src css source
 * @returns {number[]} component value types
 */
const cvTypes = (src) => parseAListOfComponentValues(src).map((n) => n.type);
/**
 * @param {string} src css source
 * @returns {number} the first token's type
 */
const firstTokenType = (src) =>
	new TokenStream(src).tokenize().next().value.type;

describe("walkCssTokens — component values (tokenToNode)", () => {
	it("classifies each leaf token type", () => {
		expect(parseAComponentValue("123").type).toBe(NodeType.Number);
		expect(parseAComponentValue("50%").type).toBe(NodeType.Percentage);
		expect(parseAComponentValue("10px").type).toBe(NodeType.Dimension);
		expect(parseAComponentValue("#id").type).toBe(NodeType.Hash);
		expect(parseAComponentValue('"ab"').type).toBe(NodeType.String);
		expect(parseAComponentValue("url(a.png)").type).toBe(NodeType.Url);
		expect(parseAComponentValue("foo(1)").type).toBe(NodeType.Function);
		expect(parseAComponentValue("[a]").type).toBe(NodeType.SimpleBlock);
		expect(parseAComponentValue("(a)").type).toBe(NodeType.SimpleBlock);
		expect(parseAComponentValue("{a}").type).toBe(NodeType.SimpleBlock);
		expect(parseAComponentValue("+").type).toBe(NodeType.Delim);
		expect(parseAComponentValue(":").type).toBe(NodeType.Colon);
		expect(parseAComponentValue(",").type).toBe(NodeType.Comma);
		expect(parseAComponentValue(";").type).toBe(NodeType.Semicolon);
		expect(parseAComponentValue("foo").type).toBe(NodeType.Ident);
		expect(parseAComponentValue(".5").type).toBe(NodeType.Number);
		expect(parseAComponentValue("@media").type).toBe(NodeType.AtKeyword);
	});

	it("decodes numeric token metadata", () => {
		const int = parseAComponentValue("123");
		expect([int.numericValue, int.typeFlag, int.sign]).toEqual([
			123,
			"integer",
			""
		]);
		const signed = parseAComponentValue("+1.5");
		expect([signed.numericValue, signed.typeFlag, signed.sign]).toEqual([
			1.5,
			"number",
			"+"
		]);
		expect(parseAComponentValue("-2").sign).toBe("-");
		expect(parseAComponentValue("1e3").typeFlag).toBe("number");
	});

	it("decodes percentage and dimension metadata", () => {
		const pct = parseAComponentValue("-50%");
		expect([pct.numericValue, pct.sign]).toEqual([-50, "-"]);
		const dim = parseAComponentValue("10px");
		expect([dim.numericValue, dim.unit, dim.typeFlag]).toEqual([
			10,
			"px",
			"integer"
		]);
		expect(parseAComponentValue("1.5EM").unit).toBe("em");
	});

	it("decodes hash id vs unrestricted and url content", () => {
		expect(parseAComponentValue("#id").typeFlag).toBe("id");
		expect(parseAComponentValue("#123").typeFlag).toBe("unrestricted");
		const url = parseAComponentValue("url(a.png)");
		expect(url.value).toBe("a.png");
		expect("a.png").toHaveLength(url.contentEnd - url.contentStart);
	});

	it("exposes function name and nested values", () => {
		const fn = parseAComponentValue("calc(1 + 2)");
		expect(fn.name).toBe("calc");
		expect(fn.value.some((c) => c.type === NodeType.Number)).toBe(true);
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

describe("walkCssTokens — parser entry points", () => {
	it("parseADeclaration parses name, value and !important", () => {
		const d = parseADeclaration("color: red");
		expect(d.name).toBe("color");
		expect(d.important).toBe(false);
		expect(d.value.length).toBeGreaterThan(0);
		expect(parseADeclaration("color: red !important").important).toBe(true);
		expect(parseADeclaration("123")).toBeUndefined();
		expect(parseADeclaration("color red")).toBeUndefined();
		expect(parseADeclaration("color")).toBeUndefined();
		// bad declaration recovery scans past a stray `}` (non-nested)
		expect(parseADeclaration("a b}c")).toBeUndefined();
	});

	it("parseARule parses qualified rules and at-rules", () => {
		const qr = parseARule("a { color: red }");
		expect(qr.type).toBe(NodeType.QualifiedRule);
		expect(qr.declarations).toHaveLength(1);
		const at = parseARule('@import "x";');
		expect(at.type).toBe(NodeType.AtRule);
		expect(at.name).toBe("import");
		expect(at.declarations).toBeNull();
		expect(at.blockRange).toBeNull();
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
		expect(parseAComponentValue("  a  ").type).toBe(NodeType.Ident);
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

	it("parseAStylesheet builds nested rules and a full range", () => {
		const src = "@media screen{.a{color:red}}b{y:2}";
		const ss = parseAStylesheet(src);
		expect(ss.type).toBe(NodeType.Stylesheet);
		expect(ss.rules.map((r) => r.type)).toEqual([
			NodeType.AtRule,
			NodeType.QualifiedRule
		]);
		expect(ss.rules[0].name).toBe("media");
		expect(ss.rules[0].childRules.map((r) => r.type)).toEqual([
			NodeType.QualifiedRule
		]);
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

describe("walkCssTokens — Node / Token", () => {
	it("exposes range, loc and toString over the source", () => {
		const decl = parseADeclaration("color: red");
		expect(decl).toBeInstanceOf(Node);
		expect(decl.range).toEqual([decl.start, decl.end]);
		expect(decl.toString()).toBe("color: red");
	});

	it("computes 1-based line / 0-based column via loc", () => {
		let loc;
		new SourceProcessor()
			.use({ [NodeType.Declaration]: (n) => (loc = n.loc) })
			.process("a{\n  color: red\n}");
		expect(loc.start).toEqual({ line: 2, column: 2 });
		expect(loc.end).toEqual({ line: 3, column: 0 });
	});

	it("lazily computes a token's value once", () => {
		const ident = parseAComponentValue("foo");
		expect(ident).toBeInstanceOf(Token);
		expect(ident.value).toBe("foo");
		expect(ident.value).toBe("foo");
	});
});

describe("walkCssTokens — SourceProcessor", () => {
	it("fires enter / exit visitors in source order", () => {
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: {
					enter: () => log.push("enter"),
					exit: () => log.push("exit")
				},
				[NodeType.Declaration]: (n) => log.push(`decl:${n.name}`)
			})
			.process("a{color:red;width:1px}");
		expect(log).toEqual(["enter", "decl:color", "decl:width", "exit"]);
	});

	it("ctx.skipChildren() stops descent into a node", () => {
		const log = [];
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: (n, p, ctx) => {
					log.push("qr");
					ctx.skipChildren();
				},
				[NodeType.Declaration]: () => log.push("decl")
			})
			.process("a{color:red}");
		expect(log).toEqual(["qr"]);
	});

	it("recurseBlocks: false stops at top-level rules", () => {
		const count = (recurseBlocks) => {
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
		const names = [];
		new SourceProcessor()
			.use({ [NodeType.Declaration]: (n) => names.push(n.name) })
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

	it("forwards the comment callback", () => {
		const seen = [];
		new SourceProcessor()
			.use({ [NodeType.Declaration]: () => {} })
			.process("a{color:red/*!c*/}", {
				comment: (input, start, end) => {
					seen.push(input.slice(start, end));
					return end;
				}
			});
		expect(seen).toEqual(["/*!c*/"]);
	});
});

describe("walkCssTokens — nesting and error recovery", () => {
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

describe("walkCssTokens — tokenizer edge cases", () => {
	it("treats an unterminated string at EOF as a string token", () => {
		expect(firstTokenType('"abc')).toBe(TT_STRING);
	});

	it("treats an unterminated url at EOF as a url token", () => {
		expect(firstTokenType("url(abc")).toBe(TT_URL);
		expect(firstTokenType("url(abc   ")).toBe(TT_URL);
	});

	it("turns a malformed url into a bad-url token", () => {
		expect(firstTokenType('url(a"b)')).toBe(TT_BAD_URL_TOKEN);
		expect(firstTokenType("url(a\\26 z x)")).toBe(TT_BAD_URL_TOKEN);
		// an escape encountered during bad-url recovery is consumed, not re-scanned
		expect(firstTokenType("url(a b\\)c)")).toBe(TT_BAD_URL_TOKEN);
	});

	it("yields a trailing EOF token when fully consumed", () => {
		const all = [...new TokenStream("a").tokenize()];
		expect(all[all.length - 1].type).toBe(TT_EOF);
	});

	it("turns a newline inside a string into a bad-string token", () => {
		expect(firstTokenType('"a\nb')).toBe(TT_BAD_STRING_TOKEN);
	});

	it("consumes CRLF as a single whitespace run and inside escapes", () => {
		expect(firstTokenType("a\r\nb")).not.toBe(TT_EOF);
		// escaped CR/LF line-continuation inside a string exercises the
		// CRLF-collapsing escaped-newline path.
		expect(firstTokenType('"a\\\r\nb"')).toBe(TT_STRING);
	});
});
