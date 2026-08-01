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
			"@media screen and (min-width:1px){a{c:1}}"
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
		expect(min("a{width:calc(1px + 2px)}")).toBe("a{width:calc(1px + 2px)}");
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
		expect(min("a:nth-child(2n+1){b:c}")).toBe("a:nth-child(2n+1){b:c}");
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

	it("keeps unicode-range values verbatim", () => {
		expect(min("@font-face{unicode-range:U+0025-00FF}")).toBe(
			"@font-face{unicode-range:U+0025-00FF}"
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
