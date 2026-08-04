"use strict";

const fs = require("fs");
const path = require("path");
const {
	NodeType,
	SourceProcessor,
	TT_AT_KEYWORD,
	TT_BAD_STRING_TOKEN,
	TT_BAD_URL_TOKEN,
	TT_CDC,
	TT_CDO,
	TT_COLON,
	TT_COMMA,
	TT_COMMENT,
	TT_DELIM,
	TT_DIMENSION,
	TT_EOF,
	TT_FUNCTION,
	TT_HASH,
	TT_IDENTIFIER,
	TT_LEFT_CURLY_BRACKET,
	TT_LEFT_PARENTHESIS,
	TT_LEFT_SQUARE_BRACKET,
	TT_NUMBER,
	TT_PERCENTAGE,
	TT_RIGHT_CURLY_BRACKET,
	TT_RIGHT_PARENTHESIS,
	TT_RIGHT_SQUARE_BRACKET,
	TT_SEMICOLON,
	TT_STRING,
	TT_URL,
	TT_WHITESPACE,
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
	parseAStylesheetsContents,
	readToken
} = require("../lib/css/syntax");

// Snapshot uses the spec-style kebab-case names for multi-word token types;
// the tokenizer emits numeric `TT_*` values. Map between them so the existing
// snapshot files stay valid.
/** @type {Record<number, string>} */
const TYPE_TO_PRINTED = {
	[TT_WHITESPACE]: "whitespace",
	[TT_COMMENT]: "comment",
	[TT_URL]: "url",
	[TT_LEFT_CURLY_BRACKET]: "left-curly-bracket",
	[TT_RIGHT_CURLY_BRACKET]: "right-curly-bracket",
	[TT_LEFT_PARENTHESIS]: "left-parenthesis",
	[TT_RIGHT_PARENTHESIS]: "right-parenthesis",
	[TT_LEFT_SQUARE_BRACKET]: "left-square-bracket",
	[TT_RIGHT_SQUARE_BRACKET]: "right-square-bracket",
	[TT_SEMICOLON]: "semicolon",
	[TT_COMMA]: "comma",
	[TT_AT_KEYWORD]: "at-keyword",
	[TT_COLON]: "colon",
	[TT_DELIM]: "delim",
	[TT_NUMBER]: "number",
	[TT_PERCENTAGE]: "percentage",
	[TT_DIMENSION]: "dimension",
	[TT_IDENTIFIER]: "identifier",
	[TT_HASH]: "hash",
	[TT_STRING]: "string",
	[TT_FUNCTION]: "function",
	[TT_CDO]: "cdo",
	[TT_CDC]: "cdc",
	[TT_BAD_STRING_TOKEN]: "bad-string-token",
	[TT_BAD_URL_TOKEN]: "bad-url-token"
};

describe("readToken", () => {
	const casesPath = path.resolve(__dirname, "./configCases/css/parsing/cases");
	const tests = fs
		.readdirSync(casesPath)
		.filter((test) => /\.css/.test(test))
		.map((item) => [
			item,
			fs.readFileSync(path.resolve(casesPath, item), "utf8")
		]);

	for (const [name, code] of tests) {
		it(`should parse and print "${name}"`, () => {
			const results = [];
			// Drive the lexer core directly: a fresh `out` per call collects the
			// raw token list (comments included); `readToken` returns undefined at EOF.
			for (let pos = 0; ;) {
				const t = readToken(
					code,
					pos,
					/** @type {import("../lib/css/syntax").MutableToken} */ ({})
				);
				if (t === undefined) break;
				pos = t.end;
				const printed = TYPE_TO_PRINTED[t.type] || t.type;
				if (t.type === TT_URL) {
					results.push([
						printed,
						code.slice(t.start, t.end),
						code.slice(t.contentStart, t.contentEnd)
					]);
				} else if (t.type === TT_HASH) {
					results.push([printed, code.slice(t.start, t.end), t.isId]);
				} else {
					results.push([printed, code.slice(t.start, t.end)]);
				}
			}

			expect(
				results.filter((item) => item[0] !== "whitespace")
			).toMatchSnapshot();
			expect(results.map((item) => item[1]).join("")).toBe(code);
		});
	}
});

/**
 * @param {string} input CSS source
 * @returns {string} input reconstructed from token source slices
 */
const tokenRoundtrip = (input) => {
	let out = "";
	for (let pos = 0; ;) {
		const t = readToken(
			input,
			pos,
			/** @type {import("../lib/css/syntax").MutableToken} */ ({})
		);
		if (t === undefined) break;
		pos = t.end;
		out += input.slice(t.start, t.end);
	}
	return out;
};

// Regressions from the css-parsing-tests corpus: each input previously hung
// the parser or dropped bytes from the token stream.
describe("CssSyntax regressions", () => {
	const NUL = String.fromCharCode(0);
	const C1 = String.fromCharCode(0x80); // U+0080: an ident-start code point

	it("does not hang on a literal U+0080 ident-start code point", () => {
		expect(parseAListOfComponentValues(C1, 0, {})).toHaveLength(1);
		expect(parseAListOfComponentValues(`a${C1}b`, 0, {})).toHaveLength(1);
	});

	it("does not hang on a backslash at EOF inside a url token", () => {
		expect(parseAListOfComponentValues("url(a\\", 0, {})).toHaveLength(1);
		expect(parseAListOfComponentValues("url(\\", 0, {})).toHaveLength(1);
	});

	it("emits an unterminated comment at EOF so token ranges cover all input", () => {
		expect(tokenRoundtrip("a /* unterminated")).toBe("a /* unterminated");
		expect(tokenRoundtrip("/* x")).toBe("/* x");
	});

	it("emits a string with a trailing backslash at EOF", () => {
		expect(tokenRoundtrip('"ab\\')).toBe('"ab\\');
		expect(tokenRoundtrip("url('a\\")).toBe("url('a\\");
	});

	it("never drops input bytes around a NUL code point", () => {
		expect(tokenRoundtrip(`a${NUL}b`)).toBe(`a${NUL}b`);
	});
});

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
	/** @type {import("../lib/css/syntax").MutableToken} */ (
		readToken(
			src,
			0,
			/** @type {import("../lib/css/syntax").MutableToken} */ ({})
		)
	).type;

describe("CssSyntax — component values (tokenToNode)", () => {
	it("classifies each leaf token type", () => {
		/**
		 * @param {string} s source
		 * @returns {import("../lib/css/syntax").ComponentValue} parsed component value
		 */
		const cv = (s) =>
			/** @type {import("../lib/css/syntax").ComponentValue} */ (
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

	it("decodes numeric token metadata", () => {
		/**
		 * @param {string} s source
		 * @returns {import("../lib/css/syntax").NumberToken} parsed number token
		 */
		const num = (s) =>
			/** @type {import("../lib/css/syntax").NumberToken} */ (
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
		const pct = /** @type {import("../lib/css/syntax").PercentageToken} */ (
			parseAComponentValue("-50%")
		);
		expect([pct.numericValue, pct.sign]).toEqual([-50, "-"]);
		const dim = /** @type {import("../lib/css/syntax").DimensionToken} */ (
			parseAComponentValue("10px")
		);
		expect([dim.numericValue, dim.unit, dim.typeFlag]).toEqual([
			10,
			"px",
			"integer"
		]);
		expect(
			/** @type {import("../lib/css/syntax").DimensionToken} */ (
				parseAComponentValue("1.5EM")
			).unit
		).toBe("em");
	});

	it("decodes hash id vs unrestricted and url content", () => {
		expect(
			/** @type {import("../lib/css/syntax").HashToken} */ (
				parseAComponentValue("#id")
			).typeFlag
		).toBe("id");
		expect(
			/** @type {import("../lib/css/syntax").HashToken} */ (
				parseAComponentValue("#123")
			).typeFlag
		).toBe("unrestricted");
		const url = /** @type {import("../lib/css/syntax").UrlToken} */ (
			parseAComponentValue("url(a.png)")
		);
		expect(url.value).toBe("a.png");
		expect("a.png").toHaveLength(url.contentEnd - url.contentStart);
	});

	it("exposes function name and nested values", () => {
		const fn = /** @type {import("../lib/css/syntax").FunctionNode} */ (
			parseAComponentValue("calc(1 + 2)")
		);
		expect(fn.name).toBe("calc");
		expect(
			fn.value.some(
				/**
				 * @param {import("../lib/css/syntax").ComponentValue} c component value
				 * @returns {boolean} true if the value is a Number node
				 */ (c) => c.type === NodeType.Number
			)
		).toBe(true);
	});

	it("reads declarations / childRules as null on non-rule nodes", () => {
		// Only rules populate the decl / child-rule slots; a function (or any
		// non-rule container) has no entry and must read back `null`.
		const fn = /** @type {import("../lib/css/syntax").QualifiedRule} */ (
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
		const d = /** @type {import("../lib/css/syntax").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(d.name).toBe("color");
		expect(d.important).toBe(false);
		expect(d.value.length).toBeGreaterThan(0);
		expect(
			/** @type {import("../lib/css/syntax").Declaration} */ (
				parseADeclaration("color: red !important")
			).important
		).toBe(true);
		expect(parseADeclaration("123")).toBeUndefined();
		expect(parseADeclaration("color red")).toBeUndefined();
		expect(parseADeclaration("color")).toBeUndefined();
		// bad declaration recovery scans past a stray `}` (non-nested)
		expect(parseADeclaration("a b}c")).toBeUndefined();
	});

	it("parseARule parses qualified rules and at-rules", () => {
		const qr = /** @type {import("../lib/css/syntax").QualifiedRule} */ (
			parseARule("a { color: red }")
		);
		expect(qr.type).toBe(NodeType.QualifiedRule);
		expect(qr.declarations).toHaveLength(1);
		const at = /** @type {import("../lib/css/syntax").AtRule} */ (
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
			/** @type {import("../lib/css/syntax").ComponentValue} */ (
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
		const a = /** @type {import("../lib/css/syntax").Rule} */ (ss.rules[0]);
		const b = /** @type {import("../lib/css/syntax").Rule} */ (ss.rules[1]);
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
		const rule = /** @type {import("../lib/css/syntax").Rule} */ (rules[0]);
		expect(rule.type).toBe(NodeType.QualifiedRule);
		expect(rule.declarations).toHaveLength(1);
	});

	it("keeps a top-level {}-block in a custom property value", () => {
		const { decls } = parseABlocksContents("--x: { a: b }; color: red");
		expect(decls).toHaveLength(2);
		expect(
			/** @type {import("../lib/css/syntax").Declaration} */ (decls[0]).name
		).toBe("--x");
	});

	it("parseADeclaration rejects a non-custom declaration with a {}-block value", () => {
		expect(parseADeclaration("color: { a: b }")).toBeUndefined();
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
			/** @type {import("../lib/css/syntax").AtRule} */ (ss.rules[0]).name
		).toBe("media");
		expect(
			/** @type {import("../lib/css/syntax").Rule[]} */ (
				/** @type {import("../lib/css/syntax").AtRule} */ (ss.rules[0])
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
		const decl = /** @type {import("../lib/css/syntax").Declaration} */ (
			parseADeclaration("color: red")
		);
		expect(decl.type).toBe(NodeType.Declaration);
		expect(decl.range).toEqual([decl.start, decl.end]);
		expect(decl.toString()).toBe("color: red");
	});

	it("computes 1-based line / 0-based column via loc", () => {
		/** @type {{ start: { line: number, column: number }, end: { line: number, column: number } } | undefined} */
		let loc;
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../lib/css/syntax").CssPath} */ path
				) => (loc = path.loc())
			})
			.process("a{\n  color: red\n}");
		expect(/** @type {NonNullable<typeof loc>} */ (loc).start).toEqual({
			line: 2,
			column: 2
		});
		expect(/** @type {NonNullable<typeof loc>} */ (loc).end).toEqual({
			line: 3,
			column: 0
		});
	});

	it("lazily computes a token's value once", () => {
		const ident = /** @type {import("../lib/css/syntax").Token} */ (
			parseAComponentValue("foo")
		);
		expect(ident.type).toBe(NodeType.Ident);
		expect(ident.value).toBe("foo");
		expect(ident.value).toBe("foo");
	});

	it("exposes every parseA* reader accessor", () => {
		/**
		 * @param {string} src source
		 * @returns {import("../lib/css/syntax").Token} the component value as a token
		 */
		const tok = (src) =>
			/** @type {import("../lib/css/syntax").Token} */ (
				parseAComponentValue(src)
			);

		// loc over the source
		const decl = /** @type {import("../lib/css/syntax").Declaration} */ (
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
		const fn = /** @type {import("../lib/css/syntax").FunctionNode} */ (
			parseAComponentValue("foo(1)")
		);
		expect([fn.nameStart, fn.nameEnd]).toEqual([0, 3]);
		expect(fn.unescapedName).toBe("foo");

		// simple-block opening token
		expect(
			/** @type {import("../lib/css/syntax").SimpleBlock} */ (
				parseAComponentValue("[a]")
			).token
		).toBe("[");

		// prelude + blockEnd on a qualified rule
		const src = "a { x: 1 }";
		const rule = /** @type {import("../lib/css/syntax").QualifiedRule} */ (
			parseARule(src)
		);
		expect(rule.prelude.length).toBeGreaterThan(0);
		expect(rule.blockEnd).toBe(src.length);
	});
});

describe("CssSyntax — SourceProcessor", () => {
	it("exposes range / unescaped / typeFlag / setEnd / setBlockEnd on the path", () => {
		/** @type {Record<string, unknown>} */
		const seen = {};
		new SourceProcessor()
			.use(
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Hash]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						seen.typeFlag = path.typeFlag();
						// `A.value` on a hash drops the `#` (raw-value slice).
						seen.hashValue = path.value();
					},
					[NodeType.Number]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						seen.numFlag = path.typeFlag();
					},
					[NodeType.String]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						seen.unescaped = path.unescaped();
					},
					[NodeType.Ident]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						seen.range = path.range();
					},
					[NodeType.QualifiedRule]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						// Round-trip the writers (set each field back to its own value).
						path.setEnd(path.node, path.end());
						path.setBlockEnd(path.node, path.blockEnd());
					}
				})
			)
			.process('a { z-index: 5; content: "x"; color: #123 }');
		expect(seen.typeFlag).toBe("unrestricted");
		expect(seen.numFlag).toBe("integer");
		expect(seen.hashValue).toBe("123");
		expect(seen.unescaped).toBe("x");
		expect(Array.isArray(seen.range)).toBe(true);
	});

	it("fires enter / exit visitors in source order", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.QualifiedRule]: {
						enter: () => log.push("enter"),
						exit: () => log.push("exit")
					},
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
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
					/** @type {import("../lib/css/syntax").CssPath} */ path
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => names.push(path.name()),
					[NodeType.Url]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => urls.push(path.value())
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => names.push(path.name())
				})
			)
			.process("color: red; background: url(a.png)");
		expect(names).toEqual([]);
	});
});

describe("CssSyntax — minify comment preservation", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { minimize: true }).code;

	it("keeps `/*!` license comments and drops the rest", () => {
		expect(min("/*! keep */\n/* drop */\na{color:red}")).toBe(
			"/*! keep */a{color:red}"
		);
	});

	it("keeps @license / @preserve comments (terser's set), case-insensitively", () => {
		expect(min("/* @license MIT */a{x:1}")).toBe("/* @license MIT */a{x:1}");
		expect(min("/*@preserve*/a{x:1}")).toBe("/*@preserve*/a{x:1}");
		expect(min("/* @LICENSE */a{x:1}")).toBe("/* @LICENSE */a{x:1}");
		// A plain annotation-free comment is still dropped.
		expect(min("/* just a note */a{x:1}")).toBe("a{x:1}");
	});

	it("emits a kept comment after the last rule (trailing flush)", () => {
		expect(min("a{color:red}/*! end */")).toBe("a{color:red}/*! end */");
	});

	it("re-emits an inner kept comment at the next rule boundary", () => {
		// The comment sits inside `a`'s block in source; a kept comment re-emits
		// before the next top-level rule, so it lands between the two rules.
		expect(min("a{color:red/*! x */}b{c:1}")).toBe(
			"a{color:red}/*! x */b{c:1}"
		);
	});

	it("keeps a comment while also firing the Comment visitor", () => {
		/** @type {string[]} */
		const seen = [];
		const { code: out } = new SourceProcessor()
			.use({
				[NodeType.Comment]: (
					/** @type {import("../lib/css/syntax").CssPath} */ path
				) => seen.push(path.source())
			})
			.process("/*! k */a{color:red}", { minimize: true });
		expect(out).toBe("/*! k */a{color:red}");
		expect(seen).toEqual(["/*! k */"]);
	});

	it("ignores `skip` while printing (every node is needed for serialization)", () => {
		// A prelude/type skip would drop selector or value nodes; printing must
		// override it so the minified output stays complete.
		const out = new SourceProcessor().process(".a .b{color:red}", {
			minimize: true,
			skip: {
				selectorPrelude: true,
				types: buildSkipSet([NodeType.Ident])
			}
		}).code;
		expect(out).toBe(".a .b{color:red}");
	});
});

describe("CssSyntax — minify token-boundary safety", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { minimize: true }).code;

	it("separates tokens a dropped comment used to keep apart", () => {
		// Without a separator these read back as one dimension and as one ident —
		// dropping a comment must never merge the tokens it stood between.
		expect(min("a{margin:1px/**/2}")).toBe("a{margin:1px 2}");
		expect(min("@media screen/**/and/**/(min-width:1px){a{c:1}}")).toBe(
			"@media screen and (width>=1px){a{c:1}}"
		);
	});

	it("separates rewritten numbers that would fuse", () => {
		// `1.0.5` is two numbers; normalized to `1` and `.5` they would join as the
		// single number `1.5`.
		expect(min("a{margin:1.0.5}")).toBe("a{margin:1 .5}");
	});

	it("separates every junction that would read back as one token", () => {
		// One case per fusion rule; each right-hand side is a single token when the
		// space is removed (`/*` even opens a comment).
		const cases = [
			["a{b:1 //**/*}", "a{b:1 / *}"],
			["a{b:./**/5}", "a{b:. 5}"],
			["a{b:+/**/5}", "a{b:+ 5}"],
			["a{b:#/**/fff}", "a{b:# fff}"],
			["a{b:@/**/x}", "a{b:@ x}"],
			// The escape's own terminator is no longer needed once `y` follows it
			// inside the token, but the separator the comment stood for is.
			["a{b:x/**/\\40 y}", "a{b:x \\40y}"],
			["a{b:\\40/**/x}", "a{b:\\40 x}"],
			// Non-ASCII is an ident code point, so these would join into one ident.
			["a{b:\u00E9/**/\u00E9}", "a{b:\u00E9 \u00E9}"],
			// `<!` and `->` guard an accidental CDO / CDC.
			["a{b:</**/!x}", "a{b:< !x}"],
			["a{b:x-/**/>y}", "a{b:x- >y}"]
		];
		for (const [src, expected] of cases) expect(min(src)).toBe(expected);
	});

	it("does not separate tokens that cannot fuse", () => {
		// A comment is not whitespace, so `.a/**/.b` stays the compound `.a.b` —
		// inserting a space here would silently make it a descendant selector.
		expect(min(".a/**/.b{c:1}")).toBe(".a.b{c:1}");
		expect(min(".a.b{c:1}")).toBe(".a.b{c:1}");
		expect(min(".a>.b{c:1}")).toBe(".a>.b{c:1}");
		// The whitespace around a `+` is what makes it an operator (CSS Values 4
		// §10.1) — `1em+2px` is not an expression. Two units that cannot be added
		// here, so the folding leaves the spacing to be judged on its own.
		expect(min("a{width:calc(1em + 2px)}")).toBe("a{width:calc(1em + 2px)}");
	});

	// An unterminated string only exists at EOF (a newline makes it a bad-string
	// instead), and there the stylesheet ends too — so a build never reaches this,
	// but `webpack.css.syntax` minifies whatever source it is handed.
	it("keeps an attribute value the tokenizer closed at EOF", () => {
		// `"bar` has no closing quote, so unquoting it would drop the `r`. An
		// at-rule prelude still prints at EOF, unlike a qualified rule (§5.4.3).
		expect(min('@unknown [foo="bar')).toBe('@unknown [foo="bar];');
		expect(min("@unknown [foo='bar")).toBe("@unknown [foo='bar];");
		// The escape swallows the final quote, so this one is unterminated too.
		expect(min('@unknown [foo="bar\\"')).toBe('@unknown [foo="bar\\"];');
		// A closed string still unquotes.
		expect(min('@unknown [foo="bar"')).toBe("@unknown [foo=bar];");
	});

	it("consumes a CRLF pair as one escape terminator", () => {
		// The tokenizer takes CRLF as a single terminator, so dropping only the CR
		// would leave a raw newline inside the identifier — `.A\nbc`, which is two
		// selectors, not the class `Abc`.
		expect(min(".\\41\r\nbc{color:red}")).toBe(".Abc{color:red}");
		expect(min("#\\41\r\nbc{color:red}")).toBe("#Abc{color:red}");
		// Every other whitespace is a single terminator.
		for (const space of [" ", "\t", "\n", "\r", "\f"]) {
			expect(min(`.\\41${space}bc{color:red}`)).toBe(".Abc{color:red}");
		}
		// An escape that has to stay keeps its whole CRLF terminator.
		expect(min(".\\31\r\nabc{color:red}")).toBe(".\\31\r\nabc{color:red}");
	});
});

describe("CssSyntax — minify keeps input the grammar rejects", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { minimize: true }).code;

	it("keeps the sourceMappingURL pragma", () => {
		// A `/*#` pragma is a link, not a comment — dropping it breaks the map of
		// an already-built stylesheet webpack only passes through.
		expect(min("/*# sourceMappingURL=a.css.map */\n.v{color:red}")).toBe(
			"/*# sourceMappingURL=a.css.map */.v{color:red}"
		);
		expect(min("/* inert */.v{color:red}")).toBe(".v{color:red}");
	});

	it("keeps a declaration neither production accepts", () => {
		// The IE star hack is not a declaration and not a qualified rule, so §5.4
		// discards it; minifying must still emit what the source had.
		expect(min("a{*zoom:1;_height:1px;color:red}")).toBe(
			"a{*zoom:1;_height:1px;color:red}"
		);
		expect(min("a{color:red;*zoom:1}")).toBe("a{color:red;*zoom:1}");
		expect(min("@media screen{a{*zoom:1;color:red}}")).toBe(
			"@media screen{a{*zoom:1;color:red}}"
		);
	});

	it("keeps rejected input in a block's contents", () => {
		expect(min("a{foo bar;color:red}")).toBe("a{foo bar;color:red}");
		// A `{}` block in a value routes the whole declaration to the qualified-rule
		// production; its contents are rejected there but must survive.
		expect(min("a{color:{{x}}}")).toBe("a{color:{{x}}}");
	});

	it("trims to the rejected input itself", () => {
		// Surrounding whitespace belongs to the block's own separators, and a span
		// holding only whitespace carries nothing at all.
		expect(min("a{   *zoom:1   ;color:red}")).toBe("a{*zoom:1;color:red}");
		expect(min("a{;;;color:red}")).toBe("a{color:red}");
	});

	it("never materializes rejected input for a walk-only parse", () => {
		// `Raw` exists only for the printer — a plain parse still drops the input,
		// so consumers never see a node type they don't know.
		const rule = parseAStylesheet("a{*zoom:1;color:red}").rules[0];
		expect(rule.declarations).toHaveLength(1);
		expect(rule.childRules).toHaveLength(0);
	});
});

describe("CssSyntax — minify value-safety edge cases", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { minimize: true }).code;

	it("keeps An+B selector arguments verbatim (no sign stripping)", () => {
		// `odd` is the one An+B a keyword names in fewer bytes; the rest stay.
		expect(min("a:nth-child(2n+1){b:c}")).toBe("a:nth-child(odd){b:c}");
		expect(min("a:nth-last-child(-n+3){b:c}")).toBe(
			"a:nth-last-child(-n+3){b:c}"
		);
		expect(min("a:nth-of-type(2n-1){b:c}")).toBe("a:nth-of-type(2n-1){b:c}");
		expect(min("a:nth-child(+3){b:c}")).toBe("a:nth-child(+3){b:c}");
		expect(min("a:nth-child(even){b:c}")).toBe("a:nth-child(even){b:c}");
	});

	it("still normalizes numbers in declaration values", () => {
		expect(min("a{margin:+1.50px}")).toBe("a{margin:1.5px}");
		expect(min("a{margin:0.50px 1.0px 0}")).toBe("a{margin:.5px 1px 0}");
	});

	it("keeps unicode-range values off the numeric path", () => {
		// Shortened as the urange it is, never by the generic number printer.
		expect(min("@font-face{unicode-range:U+0025-00FF}")).toBe(
			"@font-face{unicode-range:U+25-FF}"
		);
		expect(min("@font-face{unicode-range:u+4??}")).toBe(
			"@font-face{unicode-range:u+4??}"
		);
		expect(min("@font-face{unicode-range:U+26}")).toBe(
			"@font-face{unicode-range:U+26}"
		);
		expect(min("@font-face{unicode-range:U+0-7F,U+80-FF}")).toBe(
			"@font-face{unicode-range:U+0-7F,U+80-FF}"
		);
	});

	it("does not turn an invalid mixed-channel rgb() into a valid color", () => {
		expect(min("a{color:rgb(50%,100,30)}")).toBe("a{color:rgb(50%,100,30)}");
		expect(min("a{color:rgb(50%,100%,30)}")).toBe("a{color:rgb(50%,100%,30)}");
	});

	it("still minifies all-number and all-percentage rgb()", () => {
		expect(min("a{color:rgb(255,0,0)}")).toBe("a{color:red}");
		expect(min("a{color:rgb(100%,0%,0%)}")).toBe("a{color:red}");
	});

	it("keeps a hash inside a non-color function verbatim (id reference)", () => {
		expect(min("a{background:-moz-element(#Abc)}")).toBe(
			"a{background:-moz-element(#Abc)}"
		);
	});

	it("still minifies top-level and gradient hashes as colors", () => {
		expect(min("a{color:#ABCDEF}")).toBe("a{color:#abcdef}");
		expect(min("a{b:linear-gradient(#AABBCC,#FF0000)}")).toBe(
			"a{b:linear-gradient(#abc,red)}"
		);
	});

	it("does not leak the value context into the next parse after a visitor throw", () => {
		const processor = new SourceProcessor().use({
			[NodeType.Ident]: (
				/** @type {import("../lib/css/syntax").CssPath} */ path
			) => {
				if (path.inValue()) throw new Error("boom");
			}
		});
		expect(() => processor.process("a{color:red}")).toThrow("boom");
		// A leaked in-value flag would treat the selector hash as a color here.
		expect(min("#Face{color:red}")).toBe("#Face{color:red}");
	});
});

// The `configCases/css/minimize-*` cases cover these transforms end to end, but
// `minimizer-webpack-plugin` runs `minify` in its worker pool, so nothing there
// is reachable by the coverage instrument. These drive the same code in-process.
describe("CssSyntax — minify transforms, in-process", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { minimize: true }).code;

	/**
	 * @param {string} value a `transition-timing-function` value
	 * @returns {string} the minified value
	 */
	const easing = (value) =>
		min(`a{transition-timing-function:${value}}`).slice(
			"a{transition-timing-function:".length,
			-1
		);

	it("rewrites cubic-bezier() to the keyword naming the same curve", () => {
		expect(easing("cubic-bezier(0,0,1,1)")).toBe("linear");
		expect(easing("cubic-bezier(.25,.1,.25,1)")).toBe("ease");
		expect(easing("cubic-bezier(.42,0,1,1)")).toBe("ease-in");
		expect(easing("cubic-bezier(0,0,.58,1)")).toBe("ease-out");
		expect(easing("cubic-bezier(.42,0,.58,1)")).toBe("ease-in-out");
	});

	it("keeps a cubic-bezier() no keyword names", () => {
		// Not four arguments, so not the form the equivalences are stated for.
		expect(easing("cubic-bezier(0,0,1)")).toBe("cubic-bezier(0,0,1)");
		expect(easing("cubic-bezier(0,0,1,1,1)")).toBe("cubic-bezier(0,0,1,1,1)");
		// A non-plain-number argument could be anything at computed-value time.
		expect(easing("cubic-bezier(0,0,1,x)")).toBe("cubic-bezier(0,0,1,x)");
		// A curve with no keyword of its own.
		expect(easing("cubic-bezier(.1,.2,.3,.4)")).toBe(
			"cubic-bezier(.1,.2,.3,.4)"
		);
	});

	it("rewrites steps() to its keyword, and drops the default position", () => {
		expect(easing("steps(1,start)")).toBe("step-start");
		expect(easing("steps(1,jump-start)")).toBe("step-start");
		expect(easing("steps(1,end)")).toBe("step-end");
		// `end` is the default, so only the position goes.
		expect(easing("steps(3,end)")).toBe("steps(3)");
		expect(easing("steps(3,jump-end)")).toBe("steps(3)");
		// `start` is not the default, so it stays.
		expect(easing("steps(2,start)")).toBe("steps(2,start)");
	});

	it("keeps a steps() outside those equivalences", () => {
		expect(easing("steps(2,jump-both)")).toBe("steps(2,jump-both)");
		expect(easing("steps(x,end)")).toBe("steps(x,end)");
		expect(easing("steps(2)")).toBe("steps(2)");
	});

	it("unquotes a url() whose body is also a valid url-token", () => {
		expect(min('a{background:url("a.png")}')).toBe("a{background:url(a.png)}");
		expect(min("a{background:url('a.png')}")).toBe("a{background:url(a.png)}");
	});

	it("keeps url() quotes a url-token could not carry", () => {
		expect(min('a{background:url("a b.png")}')).toBe(
			'a{background:url("a b.png")}'
		);
		expect(min('a{background:url("a(b).png")}')).toBe(
			'a{background:url("a(b).png")}'
		);
		expect(min('a{background:url("a\\\\b.png")}')).toBe(
			'a{background:url("a\\\\b.png")}'
		);
		// A control code point, and an already-unquoted url.
		expect(min('a{background:url("a\u0001b.png")}')).toBe(
			'a{background:url("a\u0001b.png")}'
		);
		expect(min("a{background:url(a.png)}")).toBe("a{background:url(a.png)}");
	});

	it("picks the string quote that needs the fewest escapes", () => {
		expect(min('a{content:"say \\"hi\\""}')).toBe("a{content:'say \"hi\"'}");
		expect(min("a{content:'plain'}")).toBe('a{content:"plain"}');
		// Already the cheaper quote, so both of these stay as written.
		expect(min('a{content:"it\'s"}')).toBe('a{content:"it\'s"}');
		expect(min("a{content:'say \"hi\"'}")).toBe("a{content:'say \"hi\"'}");
		// Both quotes appear, so neither spelling is cheaper.
		expect(min('a{content:"has \'both\' and \\"q\\""}')).toBe(
			'a{content:"has \'both\' and \\"q\\""}'
		);
	});

	it("rewrites a `flex` value to its keyword spelling", () => {
		expect(min("a{flex:0 0 auto}")).toBe("a{flex:none}");
		expect(min("a{flex:1 1 auto}")).toBe("a{flex:auto}");
		// The names match case-insensitively; the property keeps its own spelling.
		expect(min("a{FLEX:0 0 AUTO}")).toBe("a{FLEX:none}");
	});

	it("keeps a `flex` value no keyword spells", () => {
		// `flex:1` means `1 1 0%`, and a length `0` is not a percentage `0%`.
		expect(min("a{flex:1 1 0}")).toBe("a{flex:1 1 0}");
		expect(min("a{flex:1 1}")).toBe("a{flex:1 1}");
		// A prefixed property is a different property.
		expect(min("a{-webkit-box-flex:0 0 auto}")).toBe(
			"a{-webkit-box-flex:0 0 auto}"
		);
	});

	it("re-quotes a string whose escapes the other quote would avoid", () => {
		expect(min("a{content:'it\\'s'}")).toBe('a{content:"it\'s"}');
		// Both quotes appear escaped, so switching saves nothing.
		expect(min("a{content:'a\\'b\"c'}")).toBe("a{content:'a\\'b\"c'}");
	});

	it("keeps an attribute string whose backslash is not the final escape", () => {
		expect(min('a[href="a\\\\bc"]{b:c}')).toBe('a[href="a\\\\bc"]{b:c}');
		expect(min('a[href="ab\\\\"]{b:c}')).toBe('a[href="ab\\\\"]{b:c}');
	});

	it("unquotes an attribute selector value that is a bare ident", () => {
		expect(min('a[href="x"]{b:c}')).toBe("a[href=x]{b:c}");
		expect(min("a[href='x']{b:c}")).toBe("a[href=x]{b:c}");
		expect(min('a[href="--x"]{b:c}')).toBe("a[href=--x]{b:c}");
		// The case-sensitivity flag rides along after the value.
		expect(min('a[href="x" i]{b:c}')).toBe("a[href=x i]{b:c}");
	});

	it("drops the box values CSS's `{1,4}` notation already implies", () => {
		expect(min("a{margin:1px 1px 1px 1px}")).toBe("a{margin:1px}");
		expect(min("a{margin:1px 2px 1px 2px}")).toBe("a{margin:1px 2px}");
		expect(min("a{margin:1px 2px 3px 2px}")).toBe("a{margin:1px 2px 3px}");
		expect(min("a{margin:1px 2px 1px}")).toBe("a{margin:1px 2px}");
		expect(min("a{padding:0 0}")).toBe("a{padding:0}");
		expect(min("a{border-color:red red red red}")).toBe("a{border-color:red}");
	});

	it("keeps a box the notation does not shorten", () => {
		expect(min("a{margin:1px 2px 3px 4px}")).toBe("a{margin:1px 2px 3px 4px}");
		// Five values is not the notation, so nothing is implied.
		expect(min("a{margin:1px 1px 1px 1px 1px}")).toBe(
			"a{margin:1px 1px 1px 1px 1px}"
		);
		// A substitution expands to a token sequence, so two references need not
		// be one repeated value.
		expect(min("a{margin:var(--g) var(--g)}")).toBe(
			"a{margin:var(--g) var(--g)}"
		);
		// A custom property's value is verbatim.
		expect(min("a{--margin:1px 1px}")).toBe("a{--margin:1px 1px}");
	});

	it("keeps a box repeating a CSS-wide keyword", () => {
		// Each is only valid as the whole value, so the repeated form is already
		// discarded — collapsing it would switch the declaration on.
		expect(min("a{margin:inherit inherit}")).toBe("a{margin:inherit inherit}");
		expect(min("a{margin:initial initial}")).toBe("a{margin:initial initial}");
		expect(min("a{margin:unset unset}")).toBe("a{margin:unset unset}");
		expect(min("a{margin:revert revert}")).toBe("a{margin:revert revert}");
		expect(min("a{margin:revert-layer revert-layer}")).toBe(
			"a{margin:revert-layer revert-layer}"
		);
		// The names match case-insensitively, and the `/` box is no way around it.
		expect(min("a{margin:INHERIT INHERIT}")).toBe("a{margin:INHERIT INHERIT}");
		expect(min("a{border-radius:inherit inherit/inherit inherit}")).toBe(
			"a{border-radius:inherit inherit/inherit inherit}"
		);
		// One keyword alone is the valid form, so it is left as it is.
		expect(min("a{margin:inherit}")).toBe("a{margin:inherit}");
		// `auto` and `currentcolor` are per-side values, not CSS-wide keywords.
		expect(min("a{margin:auto auto}")).toBe("a{margin:auto}");
		expect(min("a{border-color:currentcolor currentcolor}")).toBe(
			"a{border-color:currentcolor}"
		);
	});

	it("collapses each side of `border-radius`'s `/` on its own", () => {
		expect(min("a{border-radius:1px 1px 1px 1px / 1px 1px 1px 1px}")).toBe(
			"a{border-radius:1px}"
		);
		expect(min("a{border-radius:1px 1px / 2px 2px}")).toBe(
			"a{border-radius:1px/2px}"
		);
		expect(min("a{border-radius:1px 2px / 3px 4px}")).toBe(
			"a{border-radius:1px 2px/3px 4px}"
		);
		expect(min("a{border-radius:50%}")).toBe("a{border-radius:50%}");
	});

	it("leaves a `/` alone on a property that takes only one box", () => {
		// The browser discards these, so collapsing would switch them on.
		expect(min("a{margin:1px 1px/1px 1px}")).toBe("a{margin:1px 1px/1px 1px}");
		expect(min("a{padding:2px/2px}")).toBe("a{padding:2px/2px}");
	});

	it("keeps an attribute value that is not a bare ident", () => {
		expect(min('a[href="x y"]{b:c}')).toBe('a[href="x y"]{b:c}');
		expect(min('a[href=""]{b:c}')).toBe('a[href=""]{b:c}');
		// A digit start and a lone `-` are both invalid ident spellings.
		expect(min('a[href="1x"]{b:c}')).toBe('a[href="1x"]{b:c}');
		expect(min('a[href="-"]{b:c}')).toBe('a[href="-"]{b:c}');
		expect(min("a[href]{b:c}")).toBe("a[href]{b:c}");
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

describe("CssSyntax — tokenizer edge cases", () => {
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

	it("readToken returns undefined once the input is fully consumed", () => {
		// "a" is a single 1-char ident token; reading past it (offset 1) is EOF.
		expect(
			readToken(
				"a",
				0,
				/** @type {import("../lib/css/syntax").MutableToken} */ ({})
			)
		).toBeDefined();
		expect(
			readToken(
				"a",
				1,
				/** @type {import("../lib/css/syntax").MutableToken} */ ({})
			)
		).toBeUndefined();
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

describe("CssSyntax — skip set (CssProcessOptions.skip)", () => {
	// A bare declaration (parsed as block-contents, so there is no selector
	// prelude to pollute the counts). Every leaf type appears both at the top
	// level of the value and inside `bar(…)`, so one skip proves both the
	// value-list and the function-arg builders honour it.
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
		/** @type {import("../lib/css/syntax").VisitorMap} */
		const map = {};
		for (const t of Object.values(NodeType)) {
			map[t] = (/** @type {import("../lib/css/syntax").CssPath} */ path) => {
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Ident]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => log.push(`ident:${path.value()}`),
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Url]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => urls.push(path.value())
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => log.push(`decl:${path.name()}`),
					[NodeType.Ident]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
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

	it("skip.atRulePrelude drops the at-rule prelude but keeps the block", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.AtRule]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => log.push(`at:${path.name()}`),
					[NodeType.Ident]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => log.push(`ident:${path.value()}`),
					[NodeType.Declaration]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Url]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => urls.push(path.value())
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
		const decl = /** @type {import("../lib/css/syntax").Declaration} */ (
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.Number]: () => seen.push("num"),
					[NodeType.Ident]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => seen.push(path.value())
				})
			)
			.process("p: 1 foo", {
				as: "block-contents",
				skip: { types: buildSkipSet([NodeType.Number]) }
			});
		// The per-call skip drops numbers.
		expect(seen).toEqual(["foo"]);
	});
});

describe("CssSyntax — path accessors", () => {
	/** @typedef {import("../lib/css/syntax").CssPath} CssPath */
	const SRC =
		"@media screen { .a { co\\6cor: red !important; background: url(x.png) var(--v, calc(1 + 2)); } } /* note */ .b { grid: [x] 1; }";

	it("exposes every field read on the current node", () => {
		/** @type {string[]} */
		const log = [];
		new SourceProcessor()
			.use(
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.AtRule]: (/** @type {CssPath} */ path) => {
						log.push(`at:${path.name()}`);
						log.push(
							`atName:${SRC.slice(path.nameStart() + 1, path.nameEnd())}`
						);
						log.push(`prelude:${path.prelude().length > 0}`);
						log.push(
							`childRules:${
								/** @type {import("../lib/css/syntax").Rule[]} */ (
									path.childRules()
								).length
							}`
						);
						log.push(
							`decls:${
								/** @type {import("../lib/css/syntax").Declaration[]} */ (
									path.declarations()
								).length
							}`
						);
						log.push(`blockOpen:${SRC[path.blockStart()]}`);
						log.push(`blockClose:${SRC[path.blockEnd() - 1]}`);
						log.push(`span:${SRC.slice(path.start(), path.start() + 6)}`);
						log.push(`node:${path.node !== null}`);
						log.push(`parent:${path.parent}`);
					},
					[NodeType.Declaration]: (/** @type {CssPath} */ path) => {
						if (path.important()) {
							log.push(`decl:${path.name()}=${path.unescapedName()}`);
						}
					},
					[NodeType.Url]: (/** @type {CssPath} */ path) => {
						log.push(
							`url:${SRC.slice(path.contentStart(), path.contentEnd())}`
						);
					},
					[NodeType.SimpleBlock]: (/** @type {CssPath} */ path) => {
						log.push(`blockToken:${path.blockToken()}`);
					},
					[NodeType.Function]: {
						enter: (/** @type {CssPath} */ path) => {
							if (path.name() === "var") {
								log.push(`fnChildren:${path.children().length > 0}`);
							}
						},
						exit: (/** @type {CssPath} */ path) => {
							log.push(`fnExit:${path.name()}`);
						}
					},
					[NodeType.Comment]: {
						enter: (/** @type {CssPath} */ path) => {
							log.push(`comment:${SRC.slice(path.start(), path.end())}`);
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
				/** @type {import("../lib/css/syntax").VisitorMap} */ ({
					[NodeType.QualifiedRule]: (/** @type {CssPath} */ path) => {
						out.push([
							path.prelude().length > 0,
							/** @type {import("../lib/css/syntax").Declaration[]} */ (
								path.declarations()
							).length,
							/** @type {import("../lib/css/syntax").Rule[]} */ (
								path.childRules()
							).length
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

describe("CssSyntax minify — the value transforms' rejection paths", () => {
	/** @typedef {import("../lib/css/syntax").CssEnvironment} CssEnvironment */

	/**
	 * @param {string} css a stylesheet
	 * @param {CssEnvironment=} environment the target's CSS abilities
	 * @returns {string} its minified serialization
	 */
	const minify = (css, environment) =>
		new SourceProcessor().process(css, { minimize: true, environment }).code;

	/**
	 * @param {string} value a declaration value
	 * @param {CssEnvironment=} environment the target's CSS abilities
	 * @returns {string} the value as it is printed back
	 */
	const value = (value, environment) => {
		const out = minify(`a{x:${value}}`, environment);
		return /** @type {RegExpExecArray} */ (/^a\{x:([\s\S]*)\}$/.exec(out))[1];
	};

	/**
	 * The same, with the length-unit rewrite on — off by default, so the cases
	 * that are about which unit a length prints in have to ask for it.
	 * @param {string} value a declaration value
	 * @returns {string} the value as it is printed back
	 */
	const converted = (value) => {
		const out = new SourceProcessor().process(`a{x:${value}}`, {
			minimize: true,
			convertLengthUnits: true
		}).code;
		return /** @type {RegExpExecArray} */ (/^a\{x:([\s\S]*)\}$/.exec(out))[1];
	};

	describe("polar and Lab colors", () => {
		// Each conversion was checked against headless Chromium; these cases pin
		// the arguments the converter refuses rather than guesses at.
		it.each([
			["hsl(0,100%,50%)", "red"],
			["hsl(0 100% 50%)", "red"],
			["hsla(0,100%,50%,1)", "red"],
			["hwb(0 0% 100%)", "#000"],
			["lab(100% 0 0)", "#fff"],
			["lch(29.2345% 44.2 45deg)", "#752d15"],
			["oklab(1 0 0)", "#fff"],
			["oklch(70% .1 200)", "#40b1b7"],
			["oklab(40.101% .1147% .0453%)", "#484848"]
		])("converts %s", (input, expected) => {
			expect(value(input)).toBe(expected);
		});

		it.each([
			// a channel on a `.5` boundary: implementations round it both ways
			["hsl(134,50%,50%)"],
			["hwb(194 0% 0%)"],
			// past the sRGB gamut, so a hex would clip to a different color
			["lab(50% 100 -100)"],
			["oklch(90% .4 140)"],
			// within the Lab family's wider margin
			["lab(20% 40 0)"],
			// a non-percentage saturation / lightness is not the grammar converted
			["hsl(0,1,.5)"],
			// a hue in a unit the converter does not read
			["hsl(.5turn,100%,50%)"],
			// out of range
			["hsl(0,150%,50%)"],
			// a substitution, so the arguments are unknown until computed
			["hsl(var(--h),100%,50%)"],
			// the wrong argument count
			["hsl(0,100%)"],
			["lab(50% 40)"],
			// an alpha out of range
			["hsl(0 100% 50% / 1.5)"]
		])("keeps %s", (input) => {
			expect(value(input).replace(/\s+/g, "")).toBe(input.replace(/\s+/g, ""));
		});

		it("keeps a partly transparent color when the target has no hex alpha", () => {
			expect(value("hsl(0 100% 50% / .8)", { cssColorHexAlpha: false })).toBe(
				"hsl(0 100% 50% / .8)"
			);
			expect(value("rgba(255,0,0,.8)", { cssColorHexAlpha: false })).toBe(
				"rgba(255,0,0,.8)"
			);
		});

		it("spells an alpha as hex when it does", () => {
			expect(value("hsl(0 100% 50% / .8)")).toBe("#f00c");
			// the author's own number, so no boundary guard — `rgba()` agrees
			expect(value("hsl(0 100% 50% / .5)")).toBe("#ff000080");
			expect(value("rgba(255,0,0,.2)")).toBe("#f003");
			expect(value("rgba(0,0,0,.5)")).toBe("#00000080");
		});
	});

	describe("rounding and unit conversion", () => {
		it.each([
			["33.33333333%", "33.3333%"],
			["1.0000001px", "1px"],
			["400ms", ".4s"],
			[".005s", "5ms"]
		])("rewrites %s", (input, expected) => {
			expect(value(input)).toBe(expected);
		});

		it.each([
			["16px", "1pc"],
			["12pt", "1pc"],
			["10mm", "1cm"],
			["0.75pt", "1px"]
		])("rewrites %s with convertLengthUnits", (input, expected) => {
			expect(converted(input)).toBe(expected);
			expect(value(input)).toBe(input.replace("0.75", ".75"));
		});

		it.each([
			// an angle: `rotate()` amplifies a truncated digit through trig
			["33.33333333deg"],
			["1.5turn"],
			// past the magnitude the rounding was measured for
			["33333.33333px"],
			// no exact ratio to a shorter unit
			["1.3px"],
			// `q` is a conversion source, never a target
			["40q"],
			// scientific notation is left alone
			["1e3px"],
			// a unit outside the absolute families
			["1.5em"],
			["50%"]
		])("keeps %s", (input) => {
			expect(value(input)).toBe(input);
		});

		it("leaves a `@supports` condition as written", () => {
			const out = new SourceProcessor().process(
				"@supports (width:16px){a{x:16px}}",
				{ minimize: true, convertLengthUnits: true }
			).code;
			expect(out).toBe("@supports (width:16px){a{x:1pc}}");
			expect(minify("@supports (color:rgba(0,0,0,.5)){a{x:1px}}")).toBe(
				"@supports (color:rgba(0,0,0,.5)){a{x:1px}}"
			);
		});
	});

	describe("unicode-range", () => {
		/** @type {(value: string) => string} */
		const range = (value) =>
			minify(`@font-face{unicode-range:${value}}`).slice(25, -1);

		it.each([
			["leading zeros carry nothing", "U+0025-00FF", "U+25-FF"],
			["a block is what `??` says", "U+1E00-1EFF", "U+1E??"],
			["and the whole low block", "U+0000-00FF", "U+??"],
			["zeros before a wildcard too", "U+00??", "U+??"],
			["mixed case is kept", "U+1e00-1EFF", "U+1e??"]
		])("%s: %s", (_name, input, expected) => {
			expect(range(input)).toBe(expected);
		});

		it.each([
			["the end is not F-aligned", "U+1E00-1EFE"],
			["it is already shortest", "U+0-7F"],
			["a single code point", "U+26"],
			["a wildcard that carries a digit", "U+4??"],
			["the full range", "U+0-10FFFF"],
			["the value is no urange at all", "auto"],
			["the token carries no digits", "U+"]
		])("keeps it where %s", (_name, value) => {
			expect(range(value)).toBe(value);
		});

		it("shortens each range of a list", () => {
			expect(range("U+0000-00FF,U+1E00-1EFF")).toBe("U+??,U+1E??");
		});
	});

	describe("a zero angle", () => {
		it.each([
			["a{transform:rotate(0deg)}", "a{transform:rotate(0)}"],
			["a{transform:skew(0deg,0deg)}", "a{transform:skew(0,0)}"],
			["a{filter:hue-rotate(0turn)}", "a{filter:hue-rotate(0)}"]
		])("drops the unit where the grammar names <zero>: %s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the angle is not zero", "a{transform:rotate(90deg)}"],
			// `rotate3d`'s first three arguments are numbers, so a `0deg` there is a
			// declaration the engine drops — a unitless zero would revive it.
			[
				"a slot of the call takes a number",
				"a{transform:rotate3d(0deg,0,1,45deg)}"
			],
			["that call's own angle sits last", "a{transform:rotate3d(0,0,1,0deg)}"],
			["the function takes no <zero>", "a{transition-duration:0s}"],
			["it is not a function argument", "a{width:0deg}"]
		])("keeps the unit where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("keyframe selectors", () => {
		// A `calc()` inside a math expression is what a parenthesis already says,
		// but a declaration holding a substitution keeps its value as written, so
		// dropping the keyword there builds a different CSSOM.
		it("keeps a nested `calc()`", () => {
			expect(minify("a{width:calc(1em + calc(var(--w)*2))}")).toBe(
				"a{width:calc(1em + calc(var(--w)*2))}"
			);
		});

		it("writes a `from` keyframe selector as the `0%` it names", () => {
			expect(minify("@keyframes k{from{opacity:0}to{opacity:1}}")).toBe(
				"@keyframes k{0%{opacity:0}to{opacity:1}}"
			);
			expect(minify("@-webkit-keyframes k{from,50%{opacity:0}}")).toBe(
				"@-webkit-keyframes k{0%,50%{opacity:0}}"
			);
		});

		it("leaves `from` alone where it is not a keyframe selector", () => {
			expect(minify("@media print{a{from:1}}")).toBe("@media print{a{from:1}}");
		});

		// Only a comma at depth zero parts the list, so a `from` any of these
		// enclose is not the selector the rewrite is looking for.
		it.each([
			["a group", "@keyframes k{:is(from,to),from{opacity:0}}"],
			["an attribute value", '@keyframes k{[a=","],from{opacity:0}}'],
			["an escape", String.raw`@keyframes k{fro\,m,from{opacity:0}}`]
		])("splits the list past a comma %s holds", (_name, css) => {
			expect(minify(css)).toBe(css.replace(",from{", ",0%{"));
		});
	});

	describe("box longhands merging across a gap", () => {
		it("steps over a declaration that writes another family", () => {
			expect(
				minify(
					"a{margin-top:1px;margin-right:2px;color:red;margin-bottom:1px;margin-left:2px}"
				)
			).toBe("a{margin:1px 2px;color:red}");
		});

		it.each([
			["the shorthand itself", "margin:9px"],
			["a logical property", "margin-inline:9px"],
			["`all`", "all:unset"]
		])("declines across %s", (_name, between) => {
			const css = `a{margin-top:1px;${between};margin-right:2px;margin-bottom:1px;margin-left:2px}`;
			expect(minify(css)).toBe(css);
		});

		it("declines `inset` when the target cannot read the shorthand", () => {
			const css = "a{top:1px;right:2px;bottom:1px;left:2px}";
			expect(minify(css, { cssInsetShorthand: false })).toBe(css);
			expect(minify(css)).toBe("a{inset:1px 2px}");
		});

		it("merges the four corners, matched by name rather than position", () => {
			// `corner-shape` lists its longhands by row and `{1,4}` writes them
			// clockwise, so a positional read would cross two of them over.
			expect(
				minify(
					"a{border-top-left-radius:1px;border-top-right-radius:2px;border-bottom-right-radius:3px;border-bottom-left-radius:4px}"
				)
			).toBe("a{border-radius:1px 2px 3px 4px}");
			expect(
				minify(
					"a{corner-top-left-shape:squircle;corner-top-right-shape:bevel;corner-bottom-right-shape:scoop;corner-bottom-left-shape:notch}"
				)
			).toBe("a{corner-shape:squircle bevel scoop notch}");
		});

		it("declines a corner carrying two radii, which needs the `/` form", () => {
			const css =
				"a{border-top-left-radius:1px 2px;border-top-right-radius:1px 2px;border-bottom-right-radius:1px 2px;border-bottom-left-radius:1px 2px}";
			expect(minify(css)).toBe(css);
		});

		it("lets only the first of two shorthands claim a shared longhand", () => {
			// `corner-top-shape` and `corner-left-shape` both set the top-left
			// corner; the second landing on the first's blanked tail would drop it.
			expect(
				minify(
					"a{corner-top-right-shape:notch;corner-top-left-shape:bevel;corner-bottom-left-shape:scoop}"
				)
			).toBe("a{corner-top-right-shape:notch;corner-left-shape:bevel scoop}");
			expect(
				minify(
					"a{corner-end-start-shape:scoop;corner-start-start-shape:bevel;corner-start-end-shape:notch}"
				)
			).toBe(
				"a{corner-end-start-shape:scoop;corner-block-start-shape:bevel notch}"
			);
		});
	});

	describe("pair and order-free shorthand merging", () => {
		it("merges the two longhands a pair shorthand sets", () => {
			expect(minify("a{margin-block-start:1px;margin-block-end:2px}")).toBe(
				"a{margin-block:1px 2px}"
			);
			expect(minify("a{padding-inline-start:1px;padding-inline-end:1px}")).toBe(
				"a{padding-inline:1px}"
			);
			expect(minify("a{row-gap:1px;column-gap:2px}")).toBe("a{gap:1px 2px}");
		});

		it("corrects the corner pair `mdn-data` misstates", () => {
			// Chromium puts `corner-inline-start-shape` on the inline-start edge;
			// the dataset gives it the block-start edge's pair.
			expect(
				minify("a{corner-start-start-shape:bevel;corner-end-start-shape:notch}")
			).toBe("a{corner-inline-start-shape:bevel notch}");
			expect(
				minify("a{corner-start-start-shape:bevel;corner-start-end-shape:notch}")
			).toBe("a{corner-block-start-shape:bevel notch}");
		});

		it("merges `overflow` only where it collapses to one value", () => {
			expect(minify("a{overflow-x:hidden;overflow-y:hidden}")).toBe(
				"a{overflow:hidden}"
			);
			const two = "a{overflow-x:hidden;overflow-y:scroll}";
			expect(minify(two)).toBe(two);
		});

		it("declines `place-items`, newer than its longhands in every form", () => {
			const css = "a{align-items:center;justify-items:center}";
			expect(minify(css)).toBe(css);
		});

		it("refuses a pair the box collapse would refuse", () => {
			// A CSS-wide keyword beside another value is a shorthand no engine
			// accepts, and a `var()` may expand to both values at once.
			const wide = "a{margin-block-start:inherit;margin-block-end:1px}";
			expect(minify(wide)).toBe(wide);
			const sub = "a{margin-block-start:var(--x);margin-block-end:var(--x)}";
			expect(minify(sub)).toBe(sub);
		});

		it("merges an order-free shorthand's slots in grammar order", () => {
			expect(
				minify("a{outline-width:3px;outline-style:dashed;outline-color:red}")
			).toBe("a{outline:3px dashed red}");
			expect(
				minify(
					"a{column-rule-width:medium;column-rule-style:groove;column-rule-color:rebeccapurple}"
				)
			).toBe("a{column-rule:medium groove rebeccapurple}");
			expect(
				minify(
					"a{text-decoration-line:none;text-decoration-style:solid;text-decoration-color:#123;text-decoration-thickness:10%}"
				)
			).toBe("a{text-decoration:none solid #123 10%}");
			expect(minify("a{flex-direction:column;flex-wrap:wrap}")).toBe(
				"a{flex-flow:column wrap}"
			);
			expect(minify("a{text-wrap-mode:nowrap;text-wrap-style:balance}")).toBe(
				"a{text-wrap:nowrap balance}"
			);
			expect(minify('a{text-emphasis-style:"x";text-emphasis-color:red}')).toBe(
				'a{text-emphasis:"x" red}'
			);
		});

		it("classifies a zero length, a system color and a written unit", () => {
			expect(
				minify(
					"a{outline-width:0;outline-style:none;outline-color:currentcolor}"
				)
			).toBe("a{outline:0 none currentcolor}");
			expect(
				minify(
					"a{text-decoration-line:line-through;text-decoration-style:double;text-decoration-color:CanvasText;text-decoration-thickness:from-font}"
				)
			).toBe("a{text-decoration:line-through double CanvasText from-font}");
		});

		it.each([
			// `auto` is both an `outline-style` and an `outline-color`.
			["a{outline-width:3px;outline-style:auto;outline-color:auto}"],
			// A substitution could stand for any slot.
			["a{outline-width:3px;outline-style:dashed;outline-color:var(--c)}"],
			// A CSS-wide keyword means something else in a shorthand.
			["a{flex-direction:column;flex-wrap:inherit}"],
			// No slot takes a length, so the declaration is invalid either way.
			["a{flex-direction:3px;flex-wrap:wrap}"],
			// A unit no slot's type carries is not classified at all.
			["a{outline-width:2s;outline-style:dashed;outline-color:red}"],
			// Only a zero number is a length without a unit.
			["a{outline-width:3;outline-style:dashed;outline-color:red}"],
			// `list-style-type` takes any identifier, so nothing else is unambiguous.
			[
				"a{list-style-type:square;list-style-position:inside;list-style-image:url(a.png)}"
			]
		])("declines %s", (css) => {
			expect(minify(css)).toBe(css);
		});

		it("declines when a family member stands between the slots", () => {
			const css =
				"a{outline-width:3px;outline-offset:1px;outline-style:dashed;outline-color:red}";
			expect(minify(css)).toBe(css);
		});

		it("steps over a property outside the family", () => {
			expect(
				minify(
					"a{column-rule-width:medium;color:red;column-rule-style:groove;column-rule-color:rebeccapurple}"
				)
			).toBe("a{column-rule:medium groove rebeccapurple;color:red}");
		});

		it("declines a hash that is no color, at the lengths CSS omits", () => {
			// Only 3, 4, 6 and 8 digits are a hex color. Merging a 5- or 7-digit
			// one would make the whole shorthand invalid, taking the width and
			// style down with a color the engine was already dropping.
			for (const hash of ["#12345", "#1234567"]) {
				const css = `a{outline-width:3px;outline-style:dashed;outline-color:${hash}}`;
				expect(minify(css)).toBe(css);
			}
			for (const hash of ["#123", "#1234", "#123456", "#12345678"]) {
				expect(
					minify(
						`a{outline-width:3px;outline-style:dashed;outline-color:${hash}}`
					)
				).toBe(`a{outline:3px dashed ${hash}}`);
			}
		});

		it("declines a value only another slot would take", () => {
			// Invalid as written, and a merge must not rescue it into a shorthand
			// the engine would read.
			const css =
				"a{list-style-type:url(a.png);list-style-position:inside;list-style-image:none}";
			expect(minify(css)).toBe(css);
		});
	});

	describe("calc-size() and the length-only calls", () => {
		it("reduces the size argument in place", () => {
			expect(minify("a{width:calc-size(auto,1px + 2px)}")).toBe(
				"a{width:calc-size(auto,3px)}"
			);
			// The outer call reduces around an already-reduced inner one.
			expect(
				minify("a{width:calc-size(calc-size(auto,1px + 2px),3px + 4px)}")
			).toBe("a{width:calc-size(calc-size(auto,3px),7px)}");
		});

		it("declines when the argument is not constant", () => {
			// `size` is the sized element's own value, so nothing folds.
			const css = "a{width:calc-size(auto,size + 10px)}";
			expect(minify(css)).toBe(css);
		});

		it("drops a zero's unit inside a call whose every number is a length", () => {
			expect(minify("a{transform:translate(0px, 0em)}")).toBe(
				"a{transform:translate(0,0)}"
			);
			expect(minify("a{clip-path:inset(0px 1px 0em 2px)}")).toBe(
				"a{clip-path:inset(0 1px 0 2px)}"
			);
			// `scale()` takes a `<number>`, so `scale(0px)` is dropped where
			// `scale(0)` is a transform — the rewrite would revive it.
			const scale = "a{transform:scale(0px)}";
			expect(minify(scale)).toBe(scale);
		});
	});

	describe("media-feature range intervals", () => {
		it("collapses an `and` of two one-sided ranges, either order", () => {
			expect(
				minify("@media (min-width:1200px) and (max-width:2000px){a{color:red}}")
			).toBe("@media (1200px<=width<=2000px){a{color:red}}");
			expect(
				minify("@media (max-width:2000px) and (min-width:1200px){a{color:red}}")
			).toBe("@media (1200px<=width<=2000px){a{color:red}}");
		});

		it("declines two comparisons the same way round", () => {
			expect(
				minify("@media (min-width:1200px) and (min-width:1300px){a{color:red}}")
			).toBe("@media (width>=1200px) and (width>=1300px){a{color:red}}");
		});
	});

	describe("calc folding", () => {
		// A fold has to stay the value an engine would have computed, and a folded
		// expression is no longer there to be recomputed — so every step that
		// cannot be shown exact declines and leaves the expression written out.
		it.each([
			// Two units only layout can add.
			["calc(100% - 10px)"],
			["calc(1em + 2px)"],
			["calc(1px + 1deg)"],
			// A substitution could expand to anything.
			["calc(var(--x) + 1px)"],
			// Not arithmetic at all.
			["calc(1px + auto)"],
			["calc(1px +)"],
			["calc()"],
			// The grammar takes only a number on the right of a `/`, and a product
			// needs one plain number for the result to keep the units it had.
			["calc(2px*3px)"],
			["calc(1px/0)"],
			// Neither the sum nor the product is exact in a double.
			["calc(.1px + .2px)"],
			["calc(1px/7)"],
			["calc(3px/1.1)"],
			["calc(1e20px + 1px)"],
			["calc(1e308px*1e10)"],
			// Longer folded than written.
			["calc(100%/3)"],
			// A math function whose meaning is not written yet, so the sum inside it
			// folds but the call does not.
			["sqrt(4px)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("folds through a parenthesized group and a nested calc()", () => {
			expect(value("calc((1px + 2px)*3)")).toBe("9px");
			expect(value("calc(calc(1px + 2px) + 3px)")).toBe("6px");
		});

		it("counts units fixed against each other in one term", () => {
			expect(value("calc(1in + 1px)")).toBe("97px");
			expect(value("calc(2.5cm + 5mm)")).toBe("3cm");
		});

		it("prints the term in whichever unit of its group spells it", () => {
			// No `px` count equals these, so reaching the answer through the group's
			// reference unit alone would leave every one of them written out.
			expect(converted("calc(1cm + 1mm)")).toBe("11mm");
			expect(converted("calc(1in + 1cm)")).toBe("3.54cm");
			expect(converted("calc(4.5cm + 0cm)")).toBe("45mm");
			// And a sum no unit of the group spells exactly still declines.
			expect(value("calc(1px + 1cm)")).toBe("calc(1px + 1cm)");
		});

		it("keeps the parentheses on a negative the property refuses", () => {
			// `width: -5px` is dropped where `width: calc(-5px)` clamps to 0.
			expect(minify("a{width:calc(0px - 5px)}")).toBe("a{width:calc(-5px)}");
			// `<line-width>` states no range, so nothing licenses the rewrite.
			expect(minify("a{border-width:calc(0px - 5px)}")).toBe(
				"a{border-width:calc(-5px)}"
			);
		});

		it("takes them off one the property accepts", () => {
			expect(minify("a{margin-left:calc(0px - 5px)}")).toBe(
				"a{margin-left:-5px}"
			);
			// The shorthand defers wholly to those longhands, so it accepts one too.
			expect(minify("a{margin:calc(0px - 5px)}")).toBe("a{margin:-5px}");
		});

		it("keeps them on a fraction only where the property takes an integer", () => {
			// `z-index: calc(1.5)` computes to 2; `z-index: 1.5` is dropped.
			expect(minify("a{z-index:calc(1.5)}")).toBe("a{z-index:calc(1.5)}");
			expect(minify("a{opacity:calc(.5)}")).toBe("a{opacity:.5}");
		});

		it("prints a sum two units deep as the sum it reduced to", () => {
			expect(value("calc((1em + 1px)*2)")).toBe("calc(2em + 2px)");
			expect(value("calc(2*(1em + 1px))")).toBe("calc(2em + 2px)");
			expect(value("calc((100% + 1px)/2)")).toBe("calc(50% + .5px)");
			expect(value("calc(1px + 2em + 3px)")).toBe("calc(4px + 2em)");
			// The terms keep the order they were first written, and a negative one
			// is the subtraction it is.
			expect(value("calc(1em - 2em + 1px)")).toBe("calc(-1em + 1px)");
			expect(value("calc(1px - calc(1em + 1px))")).toBe("calc(0px - 1em)");
		});

		it("keeps a zero term of a sum two units deep", () => {
			// Which units may be added to which is a type rule, so dropping the term
			// would turn an expression the engine rejects into one it accepts.
			expect(value("calc(1px + 1deg - 1deg)")).toBe("calc(1px + 0deg)");
			expect(value("calc((1em + 1px)*0)")).toBe("calc(0em + 0px)");
		});

		it("keeps them on a unitless zero", () => {
			// `calc(0)` is a number, so `width:calc(0)` is dropped and renders at
			// `auto`; `width:0` is a length and renders at 0.
			expect(minify("a{width:calc(0)}")).toBe("a{width:calc(0)}");
			expect(minify("a{width:calc(1 - 1)}")).toBe("a{width:calc(0)}");
			// A zero carrying a unit is a length either way.
			expect(minify("a{width:calc(5px - 5px)}")).toBe("a{width:0}");
		});

		it("does not run inside a `@supports` condition or a custom property", () => {
			const supports = "@supports (width:calc(1px + 2px)){a{color:red}}";
			expect(minify(supports)).toBe(supports);
			expect(minify("a{--gap:calc(1px + 2px)}")).toBe(
				"a{--gap:calc(1px + 2px)}"
			);
		});
	});

	describe("min(), max(), clamp(), abs(), sign() and hypot()", () => {
		it.each([
			// A percentage basis can be negative, and which of two is smaller then
			// depends on that sign — unlike scaling one, which is linear.
			["min(50%,60%)"],
			// Only layout knows which of these is smaller.
			["min(1em,2px)"],
			["min(100%,500px)"],
			["min(var(--x),1px)"],
			// The grammar says exactly three.
			["clamp(1px,2px)"],
			["clamp(1px,2px,3px,4px)"],
			// `calc-size()` leads with a basis, so it has no arity to read — and it
			// is now the only math function with no meaning written for it.
			["calc-size(auto,size)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("picks across however many arguments the grammar allows", () => {
			expect(value("min(3px,2px,1px)")).toBe("1px");
			expect(value("max(1px,2px,3px,4px,5px)")).toBe("5px");
		});

		it("compares units fixed against each other", () => {
			expect(converted("min(1in,100px)")).toBe("6pc");
			expect(value("max(1s,500ms)")).toBe("1s");
		});

		it("clamps, with the lower bound winning a contradictory pair", () => {
			expect(value("clamp(1px,5px,3px)")).toBe("3px");
			expect(value("clamp(4px,1px,9px)")).toBe("4px");
		});

		it("keeps the parentheses on a negative, as calc() does", () => {
			expect(value("min(-5px,-2px)")).toBe("calc(-5px)");
		});

		it("drops a sign with abs(), whatever the unit scales by", () => {
			// Every length unit scales by a positive factor, so the coefficient's
			// sign is the value's even where the factor is not known here.
			expect(value("abs(-5px)")).toBe("5px");
			expect(value("abs(-1em)")).toBe("1em");
		});

		it("turns a sign() into the number it is", () => {
			expect(minify("a{z-index:sign(5px)}")).toBe("a{z-index:1}");
			// Zero keeps its parentheses too — see the unitless-zero case below.
			expect(minify("a{z-index:sign(0px)}")).toBe("a{z-index:calc(0)}");
			// `z-index` takes a negative, so the answer prints bare.
			expect(minify("a{z-index:sign(-5px)}")).toBe("a{z-index:-1}");
		});

		it("takes hypot() only where the root is exact", () => {
			expect(value("hypot(3px,4px)")).toBe("5px");
			expect(value("hypot(6px,8px,0px)")).toBe("10px");
			// Irrational for most inputs.
			expect(value("hypot(1px,1px)")).toBe("hypot(1px,1px)");
		});
	});

	describe("round(), mod() and rem()", () => {
		it("rounds to a step, by each of the grammar's strategies", () => {
			expect(value("round(5px,2px)")).toBe("6px");
			expect(value("round(nearest,5.5px,1px)")).toBe("6px");
			expect(value("round(up,4.5px,2px)")).toBe("6px");
			expect(value("round(down,5.5px,2px)")).toBe("4px");
			expect(value("round(to-zero,5.5px,2px)")).toBe("4px");
			// `down` is the floor, so a negative goes further from zero, and
			// `to-zero` truncates instead.
			expect(value("round(down,-4.5px,2px)")).toBe("calc(-6px)");
			expect(value("round(to-zero,-5.5px,2px)")).toBe("calc(-4px)");
		});

		it("splits mod() and rem() on whose sign the result takes", () => {
			expect(value("mod(-7px,3px)")).toBe("2px");
			expect(value("rem(-7px,3px)")).toBe("calc(-1px)");
			expect(value("mod(7px,-3px)")).toBe("calc(-2px)");
			expect(value("rem(7px,-3px)")).toBe("1px");
		});

		it.each([
			// Exactly on a step is where engines part company: these are step
			// functions, so an ulp in the engine's own conversion moves the answer a
			// whole step. Chromium reads `round(down,10cm,2cm)` as `8cm` and
			// `mod(10px,-2px)` as `-2px`, both a step off the exact answer.
			["round(4px,2px)"],
			["mod(10px,-2px)"],
			["rem(10px,2px)"],
			// A zero step is NaN, which engines render differently; a negative one
			// is not reasoned about here.
			["round(5px,0px)"],
			["round(5px,-2px)"],
			["mod(5px,0px)"],
			// Two units only layout can compare.
			["round(5em,2px)"],
			["mod(50%,20%)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("keeps that unit through a fold in the argument too", () => {
			// A fold prints in whichever unit is shortest, which is the rewrite these
			// arguments refuse: Chromium reads `round(down,4.5cm,1.5cm)` as 113.386px
			// and `round(down,45mm,15mm)` as 170.079px.
			expect(value("round(down,calc(4.5cm),calc(1.5cm))")).toBe(
				"round(down,calc(4.5cm),calc(1.5cm))"
			);
			expect(value("round(down,min(4.5cm,9cm),1.5cm)")).toBe(
				"round(down,min(4.5cm,9cm),1.5cm)"
			);
			// Including a stepped function inside a stepped function.
			expect(value("round(down,round(down,10cm,3cm),1cm)")).toBe(
				"round(down,round(down,10cm,3cm),1cm)"
			);
			// The function's own result is not an argument of one, so it still folds.
			expect(value("round(5px,2px)")).toBe("6px");
		});

		it("keeps the unit a stepped argument was written with", () => {
			// `4.5cm` and `45mm` are the same length, but not the same step:
			// Chromium reads `round(down,4.5cm,1.5cm)` as `3cm` and the `mm`
			// spelling as `4.5cm`, so the conversion that holds everywhere else is
			// suppressed in here.
			expect(value("round(down,4.5cm,1.5cm)")).toBe("round(down,4.5cm,1.5cm)");
			// Outside one it still applies.
			expect(converted("4.5cm")).toBe("45mm");
		});
	});

	describe("sqrt(), pow(), log(), exp() and the trig functions", () => {
		it.each([
			// Irrational, so there is no value to write down.
			["calc(sqrt(2)*1px)"],
			["calc(pow(2,.5)*1px)"],
			// `e` is not a double, which leaves only the powers of it this knows.
			["calc(exp(1)*1px)"],
			["calc(log(10)*1px)"],
			// Not a whole power of the base.
			["calc(log(9,2)*1px)"],
			// Sine and cosine are irrational an odd eighth turn from zero, and
			// tangent has an asymptote on the odd quarters.
			["calc(sin(30deg)*1px)"],
			["calc(sin(45deg)*1px)"],
			["calc(cos(50grad)*1px)"],
			["calc(tan(90deg)*1px)"],
			// A radian is not a whole number of eighth turns except at zero.
			["calc(sin(1)*1px)"],
			["calc(cos(1rad)*1px)"],
			// The inverse functions answer with an angle only at three arguments.
			["asin(.5)"],
			["atan2(1,2)"],
			// Both zero is left to the engine.
			["atan2(0,0)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it("takes a root or a power that multiplies back exactly", () => {
			expect(value("calc(sqrt(4)*1px)")).toBe("2px");
			expect(value("calc(sqrt(2.25)*1px)")).toBe("1.5px");
			expect(value("calc(pow(2,3)*1px)")).toBe("8px");
			expect(value("calc(pow(2,-2)*1px)")).toBe(".25px");
			expect(value("calc(pow(2,0)*1px)")).toBe("1px");
		});

		it("takes a logarithm that lands on a whole power of its base", () => {
			expect(value("calc(log(8,2)*1px)")).toBe("3px");
			expect(value("calc(log(1,10)*1px)")).toBe("0");
			expect(value("calc(exp(0)*1px)")).toBe("1px");
		});

		it("takes sine, cosine and tangent an eighth turn apart", () => {
			expect(value("calc(cos(0)*1px)")).toBe("1px");
			expect(value("calc(sin(90deg)*1px)")).toBe("1px");
			expect(value("calc(sin(.25turn)*1px)")).toBe("1px");
			expect(value("calc(cos(100grad)*1px)")).toBe("0");
			expect(value("calc(cos(180deg)*1px)")).toBe("calc(-1px)");
			expect(value("calc(tan(45deg)*1px)")).toBe("1px");
			expect(value("calc(tan(180deg)*1px)")).toBe("0");
		});

		it("answers the inverse functions in degrees", () => {
			expect(value("asin(1)")).toBe("90deg");
			expect(value("acos(0)")).toBe("90deg");
			expect(value("atan(1)")).toBe("45deg");
			expect(value("atan2(1,1)")).toBe("45deg");
			expect(value("atan2(0,-1)")).toBe("180deg");
			// A ratio of two lengths is a number, so it answers the same way.
			expect(value("atan2(1px,-1px)")).toBe("135deg");
		});

		it("prints a folded operand of an outer expression bare", () => {
			// No property judges it in here, so a fraction or a zero needs no
			// `calc()` of its own — which is what lets the outer fold go on.
			expect(value("calc(sin(0)*1px)")).toBe("0");
			expect(value("calc(1px*pow(2,3))")).toBe("8px");
			expect(value("min(sqrt(4)*1px,3px)")).toBe("2px");
		});
	});
});

describe("CssSyntax — convertLengthUnits", () => {
	/**
	 * @param {string} value a `width` value
	 * @param {boolean=} convertLengthUnits whether lengths may change unit
	 * @returns {string} the minified value
	 */
	const width = (value, convertLengthUnits = false) =>
		new SourceProcessor()
			.process(`a{width:${value}}`, { minimize: true, convertLengthUnits })
			.code.slice("a{width:".length, -1);

	it("keeps a length in the unit it was written with by default", () => {
		expect(width("16px")).toBe("16px");
		expect(width("120px")).toBe("120px");
		expect(width("192px")).toBe("192px");
		expect(width("10mm")).toBe("10mm");
	});

	it("rewrites one into the shortest equal unit when asked", () => {
		expect(width("16px", true)).toBe("1pc");
		expect(width("120px", true)).toBe("90pt");
		expect(width("192px", true)).toBe("2in");
		expect(width("10mm", true)).toBe("1cm");
	});

	it("converts a time either way — only lengths are gated", () => {
		const duration = (/** @type {string} */ value) =>
			new SourceProcessor()
				.process(`a{transition-duration:${value}}`, { minimize: true })
				.code.slice("a{transition-duration:".length, -1);
		expect(duration("500ms")).toBe(".5s");
		expect(duration(".005s")).toBe("5ms");
	});

	it("still folds a sum into a unit the expression was written with", () => {
		// The fold is the win here, not the unit: printing `11mm` introduces no
		// unit the author did not write, where `1pc` for `16px` would.
		expect(width("calc(1cm + 1mm)")).toBe("11mm");
		expect(width("calc(2in - 1in)")).toBe("1in");
		expect(width("calc(1px + 15px)")).toBe("16px");
		expect(width("calc(1px + 15px)", true)).toBe("1pc");
	});

	it("declines a sum that reaches no written unit exactly", () => {
		// `1cm` is not a whole number of `px`, and `px` is all the gate leaves.
		expect(width("calc(1cm + 1px)")).toBe("calc(1cm + 1px)");
	});
});

describe("CssSyntax minify — vendor prefixes (properties)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			minimize: true,
			environment: browsers ? { browsers } : undefined
		}).code;

	it("adds the prefix a browser below the unprefixed version needs", () => {
		expect(minify("a{user-select:none}", ["chrome 40"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("adds `-moz-` for Firefox and `-ms-` for IE from their own engine", () => {
		expect(minify("a{user-select:none}", ["firefox 40"])).toBe(
			"a{-moz-user-select:none;user-select:none}"
		);
		expect(minify("a{user-select:none}", ["ie 11"])).toBe(
			"a{-ms-user-select:none;user-select:none}"
		);
	});

	it("adds every prefix the mixed selection needs, once each", () => {
		expect(minify("a{user-select:none}", ["chrome 40", "firefox 40"])).toBe(
			"a{-webkit-user-select:none;-moz-user-select:none;user-select:none}"
		);
	});

	it("leaves a declaration alone when the target reads it unprefixed", () => {
		expect(minify("a{user-select:none}", ["chrome 120"])).toBe(
			"a{user-select:none}"
		);
	});

	it("never doubles a prefix the source already carries", () => {
		expect(
			minify("a{-webkit-user-select:none;user-select:none}", ["chrome 40"])
		).toBe("a{-webkit-user-select:none;user-select:none}");
	});

	it("drops a prefixed declaration no target needs, unprefixed sibling present", () => {
		expect(
			minify("a{-webkit-user-select:none;user-select:none}", ["chrome 120"])
		).toBe("a{user-select:none}");
	});

	it("keeps a prefix a target still needs (Safari never unprefixed it)", () => {
		expect(
			minify("a{-webkit-user-select:none;user-select:none}", ["safari 17"])
		).toBe("a{-webkit-user-select:none;user-select:none}");
	});

	it("keeps a prefixed-only declaration — it is the only thing that paints", () => {
		expect(minify("a{-webkit-user-select:none}", ["chrome 120"])).toBe(
			"a{-webkit-user-select:none}"
		);
	});

	it("never carries an obsolete cross-engine prefix (`-khtml-` for Safari)", () => {
		expect(minify("a{user-select:none}", ["safari 17"])).not.toContain(
			"-khtml-"
		);
	});

	it("does nothing without a target list", () => {
		expect(minify("a{user-select:none}")).toBe("a{user-select:none}");
	});

	it("does nothing for a property no browser ever prefixed", () => {
		expect(minify("a{color:red}", ["chrome 40"])).toBe("a{color:red}");
	});

	it("reads a browser version's minor part, not just the major", () => {
		// `appearance` loses its prefix in Safari at 15.4; 15.3 still needs `-webkit-`.
		expect(minify("a{appearance:none}", ["safari 15.3"])).toBe(
			"a{-webkit-appearance:none;appearance:none}"
		);
		expect(minify("a{appearance:none}", ["safari 15.4"])).toBe(
			"a{appearance:none}"
		);
	});

	it("reads a version range by its low end", () => {
		expect(minify("a{appearance:none}", ["ios_saf 15.2-15.3"])).toBe(
			"a{-webkit-appearance:none;appearance:none}"
		);
	});

	it("treats Safari Technology Preview as newest (no prefix)", () => {
		expect(minify("a{user-select:none}", ["safari TP"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("adds the prefix on both of two rules using it (decision memoized)", () => {
		expect(
			minify("a{user-select:none}b{user-select:auto}", ["chrome 40"])
		).toBe(
			"a{-webkit-user-select:none;user-select:none}b{-webkit-user-select:auto;user-select:auto}"
		);
	});

	it("keeps prefixing correct through a nested rule", () => {
		expect(minify("@media screen{a{user-select:none}}", ["chrome 40"])).toBe(
			"@media screen{a{-webkit-user-select:none;user-select:none}}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (at-rules)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			minimize: true,
			environment: browsers ? { browsers } : undefined
		}).code;

	it("prepends a prefixed copy an old target needs", () => {
		expect(minify("@keyframes s{to{opacity:1}}", ["chrome 40"])).toBe(
			"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}"
		);
	});

	it("leaves it alone when the target reads it unprefixed", () => {
		expect(minify("@keyframes s{to{opacity:1}}", ["chrome 120"])).toBe(
			"@keyframes s{to{opacity:1}}"
		);
	});

	it("does not double a prefixed copy the source already has", () => {
		expect(
			minify("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}", [
				"chrome 40"
			])
		).toBe("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}");
	});

	it("drops a prefixed at-rule no target needs after its unprefixed twin", () => {
		expect(
			minify("@keyframes s{to{opacity:1}}@-webkit-keyframes s{to{opacity:1}}", [
				"chrome 120"
			])
		).toBe("@keyframes s{to{opacity:1}}");
	});

	it("pairs a cased `@Keyframes` with its prefixed twin (case-insensitive)", () => {
		expect(
			minify("@-webkit-keyframes s{to{opacity:1}}@Keyframes s{to{opacity:1}}", [
				"chrome 40"
			])
		).toBe("@-webkit-keyframes s{to{opacity:1}}@Keyframes s{to{opacity:1}}");
	});

	it("gives each same-named at-rule its own copy, so the last still wins", () => {
		expect(
			minify("@keyframes s{to{opacity:1}}@keyframes s{to{opacity:.5}}", [
				"chrome 40"
			])
		).toBe(
			"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}@-webkit-keyframes s{to{opacity:.5}}@keyframes s{to{opacity:.5}}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minify("@keyframes s{to{opacity:1}}")).toBe(
			"@keyframes s{to{opacity:1}}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (selectors)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			minimize: true,
			environment: browsers ? { browsers } : undefined
		}).code;

	it("prepends the engine spelling a target needs, keeping the source colons", () => {
		expect(minify("::placeholder{color:red}", ["chrome 40"])).toBe(
			"::-webkit-input-placeholder{color:red}::placeholder{color:red}"
		);
	});

	it("prefixes a pseudo behind a compound selector", () => {
		expect(minify("input::placeholder{color:red}", ["chrome 40"])).toBe(
			"input::-webkit-input-placeholder{color:red}input::placeholder{color:red}"
		);
	});

	it("adds `-moz-` for `::selection` on Firefox", () => {
		expect(minify("::selection{color:red}", ["firefox 40"])).toBe(
			"::-moz-selection{color:red}::selection{color:red}"
		);
	});

	it("leaves a pseudo alone when the target reads it unprefixed", () => {
		expect(minify("::placeholder{color:red}", ["chrome 120"])).toBe(
			"::placeholder{color:red}"
		);
	});

	it("drops a prefixed pseudo no target needs after its unprefixed twin", () => {
		expect(
			minify("::placeholder{color:red}::-webkit-input-placeholder{color:red}", [
				"chrome 120"
			])
		).toBe("::placeholder{color:red}");
	});

	it("leaves a selector list alone — prefixing one would drop the whole list", () => {
		expect(minify(".a::placeholder,.b{color:red}", ["chrome 40"])).toBe(
			".a::placeholder,.b{color:red}"
		);
	});

	it("gives each same-pseudo rule its own copy, so the last still wins", () => {
		expect(
			minify("::placeholder{color:red}::placeholder{color:blue}", ["chrome 40"])
		).toBe(
			"::-webkit-input-placeholder{color:red}::placeholder{color:red}::-webkit-input-placeholder{color:blue}::placeholder{color:blue}"
		);
	});

	it("matches a pseudo name case-insensitively", () => {
		expect(minify("::PLACEHOLDER{color:red}", ["chrome 40"])).toBe(
			"::-webkit-input-placeholder{color:red}::PLACEHOLDER{color:red}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minify("::placeholder{color:red}")).toBe("::placeholder{color:red}");
	});
});
