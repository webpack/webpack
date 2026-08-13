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

	it("reads every escaped spelling of `url(` as a url", () => {
		/**
		 * @param {string} s source
		 * @returns {import("../lib/css/syntax").ComponentValue} parsed value
		 */
		const cv = (s) =>
			/** @type {import("../lib/css/syntax").ComponentValue} */ (
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

describe("CssSyntax — block streaming", () => {
	// A block streams once it holds more than `_STREAM_MIN_NODES` nodes; under
	// that it is collected and walked in one batch, as it always was. `BIG` clears
	// the threshold and `SMALL` stays well under, and every case below pins which
	// of the two it is exercising, so none of them can quietly stop testing the
	// streamed path if the threshold moves.
	/** @type {(i: number) => string} */
	const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:1px}`;
	/** @type {(n: number, f: (i: number) => string) => string} */
	const repeat = (n, f) => {
		let s = "";
		for (let i = 0; i < n; i++) s += f(i);
		return s;
	};
	const BIG = repeat(1800, rule);
	const SMALL = repeat(4, rule);

	/**
	 * Child rules the first rule of `type` reports: 0 means it streamed (its
	 * children went to the visitors, not to its body), a positive count means it
	 * was collected.
	 * @param {string} src css source
	 * @param {number=} type the node type to look at (default `AtRule`)
	 * @returns {number | null} the count, or null if that rule has no block
	 */
	const childCount = (src, type = NodeType.AtRule) => {
		/** @type {number | null} */
		let count = null;
		let seen = false;
		new SourceProcessor()
			.use({
				[type]: (/** @type {import("../lib/css/syntax").CssPath} */ path) => {
					if (seen) return;
					seen = true;
					const rules = path.childRules();
					count = rules === null ? null : rules.length;
				}
			})
			.process(src, { mode: "minify" });
		return count;
	};

	/**
	 * Every node the walk visits, as `type|index|start`, entering and exiting.
	 * @param {string} src css source
	 * @param {import("../lib/css/syntax").CssProcessOptions=} extra more options
	 * @returns {string[]} the visit sequence
	 */
	const walk = (src, extra) => {
		/** @type {string[]} */
		const seq = [];
		/** @type {import("../lib/css/syntax").VisitorMap} */
		const map = {};
		for (const name of Object.keys(NodeType)) {
			const type = NodeType[/** @type {keyof typeof NodeType} */ (name)];
			map[type] = {
				enter: (/** @type {import("../lib/css/syntax").CssPath} */ path) =>
					seq.push(`+${name}|${path.index}|${path.start()}`),
				exit: (/** @type {import("../lib/css/syntax").CssPath} */ path) =>
					seq.push(`-${name}|${path.index}|${path.start()}`)
			};
		}
		new SourceProcessor().use(map).process(src, extra);
		return seq;
	};

	/**
	 * @param {string} src css source
	 * @returns {string} its minified output
	 */
	const minify = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("streams a block past the threshold and collects one under it", () => {
		expect(childCount(`@media screen{${BIG}}`)).toBe(0);
		expect(childCount(`@media screen{${SMALL}}`)).toBe(4);
	});

	it("enters a streamed rule before its children and exits after them", () => {
		const seq = walk(`@media screen{${SMALL}}`, { recurseBlocks: true });
		expect(seq[0]).toBe("+AtRule|0|0");
		expect(seq[seq.length - 1]).toBe("-AtRule|0|0");
		const streamed = walk(`@media screen{${BIG}}`);
		expect(streamed[0]).toBe("+AtRule|0|0");
		expect(streamed[streamed.length - 1]).toBe("-AtRule|0|0");
	});

	it("visits a streamed block's children in source order", () => {
		// The collected walk emits every declaration and only then every child
		// rule; a streamed block emits each child as it finishes, so declarations
		// and child rules interleave the way the source has them.
		const src = `@media screen{${repeat(
			1800,
			(i) => `p${i}:v${i};${rule(i)}`
		)}}`;
		const kinds = walk(src)
			.filter(
				(e) => e.startsWith("+Declaration|") || e.startsWith("+QualifiedRule|")
			)
			.map((e) => e.slice(1, e.indexOf("|")));
		// A declaration of the block, then a rule, then that rule's own two
		// declarations — repeating, which only source order produces.
		expect(kinds.slice(0, 8)).toEqual([
			"Declaration",
			"QualifiedRule",
			"Declaration",
			"Declaration",
			"Declaration",
			"QualifiedRule",
			"Declaration",
			"Declaration"
		]);
	});

	it("indexes a streamed block's declarations and child rules apart", () => {
		// The collected walk numbers the two lists independently (see `_walkRule`),
		// so a streamed block has to as well — not one counter running across the
		// merged source order.
		const src = `@media screen{${repeat(
			1800,
			(i) => `p${i}:v${i};${rule(i)}`
		)}}`;
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Declaration]: (
					/** @type {import("../lib/css/syntax").CssPath} */ path
				) => {
					const parent = path.parent;
					if (parent !== null && path.type(parent) === NodeType.AtRule) {
						seen.push(`d${path.index}`);
					}
				},
				[NodeType.QualifiedRule]: (
					/** @type {import("../lib/css/syntax").CssPath} */ path
				) => seen.push(`r${path.index}`)
			})
			.process(src, { mode: "minify" });
		expect(seen.slice(0, 6)).toEqual(["d0", "r0", "d1", "r1", "d2", "r2"]);
		expect(seen[seen.length - 1]).toBe("r1799");
	});

	it("enters nested streamed blocks outermost first", () => {
		// The inner block crosses the threshold first, so the outer rule has to be
		// entered on the way in — otherwise `@supports` would be entered before the
		// `@media` holding it.
		const seq = walk(`@media screen{@supports (display:grid){${BIG}}}`);
		expect(seq[0]).toBe("+AtRule|0|0");
		expect(seq.filter((e) => e.startsWith("+AtRule|"))[1]).toBe("+AtRule|0|14");
	});

	it("reads a streamed rule's body as an empty block, not as no block", () => {
		/** @type {(src: string) => unknown[]} */
		const body = (src) => {
			/** @type {unknown[]} */
			const seen = [];
			new SourceProcessor()
				.use({
					[NodeType.AtRule]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						const decls = path.declarations();
						const rules = path.childRules();
						seen.push(decls === null ? null : decls.length);
						seen.push(rules === null ? null : rules.length);
					}
				})
				.process(src, { mode: "minify" });
			return seen;
		};
		// A streamed rule hands its children to the visitors instead of collecting
		// them, so both lists read empty — but the block itself is still there,
		// which `null` (the block-less at-rules) would deny.
		expect(body(`@media screen{${BIG}}`)).toEqual([0, 0]);
		expect(body(`@media screen{${SMALL}}`)).toEqual([0, 4]);
		expect(body("@import url(x);")).toEqual([null, null]);
	});

	it("honours skipChildren() and recurseBlocks on a streamed rule", () => {
		/** @type {(opts: import("../lib/css/syntax").CssProcessOptions, skip: boolean) => number} */
		const children = (opts, skip) => {
			let n = 0;
			new SourceProcessor()
				.use({
					[NodeType.AtRule]: (
						/** @type {import("../lib/css/syntax").CssPath} */ path
					) => {
						if (skip) path.skipChildren();
					},
					[NodeType.QualifiedRule]: () => n++
				})
				.process(`@media screen{${BIG}}`, opts);
			return n;
		};
		expect(children({}, true)).toBe(0);
		expect(children({}, false)).toBe(1800);
		expect(children({ recurseBlocks: false }, false)).toBe(0);
	});

	it("prints a streamed block as the collected printer would", () => {
		// The fixture is already minimal, so the whole output is known: opener,
		// every child in source order, closer — and no `;` before the `}`.
		expect(minify(`@media screen{${BIG}}`)).toBe(`@media screen{${BIG}}`);
		expect(minify(`@media screen{@supports (display:grid){${BIG}}}`)).toBe(
			`@media screen{@supports (display:grid){${BIG}}}`
		);
		// Children printing one block join into a selector list, so the streamed
		// path has to reach the list a collected one does rather than the input.
		/** @type {(n: number) => string} */
		const nesting = (n) =>
			`.root{color:red;${repeat(n, (i) => `& .n${i}{color:red}`)}}`;
		/** @type {(n: number) => string} */
		const joined = (n) =>
			`.root{color:red;${Array.from({ length: n }, (_, i) => `& .n${i}`).join(
				","
			)}{color:red}}`;
		expect(minify(nesting(4))).toBe(joined(4));
		expect(minify(nesting(1800))).toBe(joined(1800));
	});

	it("reads a streamed rule's prelude in terms of what encloses it", () => {
		// `from` is the `0%` a keyframe selector means only inside `@keyframes`, so
		// the opener has to be printed with the whole path bound, not just the rule.
		const nested = repeat(3000, (i) => `& .x${i}{color:red}`);
		expect(
			childCount(`@keyframes k{from{${nested}}}`, NodeType.QualifiedRule)
		).toBe(0);
		expect(minify(`@keyframes k{from{${nested}}}`)).toBe(
			`@keyframes k{0%{${nested}}}`
		);
		// `to` is already shorter than the `100%` it names, and a `.from` selector
		// outside `@keyframes` is a class like any other.
		expect(minify(`@keyframes k{to{${nested}}}`)).toBe(
			`@keyframes k{to{${nested}}}`
		);
		expect(minify(`.from{${nested}}`)).toBe(`.from{${nested}}`);
	});

	it("falls back past the depth the frame table holds", () => {
		// Deeper than `_STREAM_MAX_DEPTH`, where a block is materialized instead of
		// streamed; the levels above it still stream, so the two have to meet.
		// `@media m0` and not a feature query: a `(min-width:…)` prelude minifies to
		// the range spelling, and the point here is the nesting, not the prelude.
		const depth = 70;
		const open = repeat(depth, (i) => `@media m${i}{`);
		const close = repeat(depth, () => "}");
		expect(minify(`${open}${BIG}${close}`)).toBe(`${open}${BIG}${close}`);
		// The same nesting with nothing in it still collapses to nothing.
		expect(minify(`${open}${close}`)).toBe("");
	});

	it("drops a streamed block that prints to nothing", () => {
		// The opener is held back until something inside prints, so a rule whose
		// every child minifies away is still dropped whole at its `}`. An empty
		// rule is only a few nodes, so it takes a lot of them to cross.
		const EMPTY = repeat(6000, (i) => `.e${i}{}`);
		expect(childCount(`@media a{${EMPTY}}`)).toBe(0);
		expect(minify(`@media a{${EMPTY}}`)).toBe("");
		expect(minify(`@media a{${EMPTY}@media b{${EMPTY}}}`)).toBe("");
		expect(minify(`@media a{${EMPTY}.keep{color:red}}`)).toBe(
			"@media a{.keep{color:red}}"
		);
		// A `@layer` block carries meaning even when empty, so it stays.
		expect(minify(`@layer a{${EMPTY}}`)).toBe("@layer a{}");
	});

	it("keeps only the last of a streamed block's identical declarations", () => {
		// Reached by taking the earlier one back out of the output, since a
		// streamed block cannot look ahead for the later one. The duplicate is
		// separated from its match by 3000 child rules, so this is the whole block
		// agreeing, not a run of adjacent declarations.
		const middle = repeat(3000, (i) => `& .m${i}{color:red}`);
		const src = `.root{color:red;${middle}color:red;}`;
		expect(childCount(src, NodeType.QualifiedRule)).toBe(0);
		expect(minify(src)).toBe(`.root{${middle}color:red}`);
	});

	it("takes back only its own output when it drops the last `;`", () => {
		// The `;` a `}` makes redundant is dropped by walking back over the pieces
		// the block emitted, past the empty one a later duplicate took back. What
		// stands before the block keeps its own separator.
		const mid = repeat(3000, (i) => `& .m${i}{color:red}`);
		const src = `.root{lead:1;${mid}dup:2;dup:2;}`;
		expect(childCount(src, NodeType.QualifiedRule)).toBe(0);
		expect(minify(src)).toBe(`.root{lead:1;${mid}dup:2}`);
	});

	it("declines to stream a block a longhand family could still merge in", () => {
		// `_mergeBoxLonghands` needs every declaration at once, and only runs in a
		// block with no child rule — so such a block is never streamed, however far
		// past the threshold it grows, and its four longhands still collapse.
		const src = `.root{${repeat(
			20000,
			(i) => `--v${i}:${i};`
		)}margin-top:1px;margin-right:2px;margin-bottom:3px;margin-left:4px}`;
		/** @type {number | null} */
		let declared = null;
		let seen = false;
		new SourceProcessor()
			.use({
				[NodeType.QualifiedRule]: (
					/** @type {import("../lib/css/syntax").CssPath} */ path
				) => {
					if (seen) return;
					seen = true;
					const decls = path.declarations();
					declared = decls === null ? null : decls.length;
				}
			})
			.process(src, { mode: "minify" });
		// Collected, so it still reports every declaration it holds — a streamed
		// block would report none, and the merge below would be lost with them.
		expect(declared).toBe(20004);
		expect(minify(src)).toContain("margin:1px 2px 3px 4px");
	});

	it("keeps the comments a streamed run carries through", () => {
		expect(minify(`/*! keep */@media a{${BIG}}/*! tail */`)).toBe(
			`/*! keep */@media a{${BIG}}/*! tail */`
		);
	});

	it("leaves no state behind for the next parse", () => {
		const src = "@media x{a{c:1}b{d:2}}";
		let seen = 0;
		let throwAt = -1;
		const sp = new SourceProcessor().use({
			[NodeType.QualifiedRule]: () => {
				if (++seen === throwAt) throw new Error("boom");
			}
		});
		const plain = walk(src);
		sp.process(`@media screen{${BIG}}`, {});
		expect(walk(src)).toEqual(plain);
		// Part-way through the streamed block, so the frame depth is unwound from
		// inside the walk rather than at the closing `}`.
		seen = 0;
		throwAt = 500;
		expect(() => sp.process(`@media screen{${BIG}}`, {})).toThrow("boom");
		throwAt = -1;
		expect(walk(src)).toEqual(plain);
		expect(minify(src)).toBe(src);
	});
});

describe("CssSyntax — minify comment preservation", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} the minified serialization
	 */
	const min = (src) =>
		new SourceProcessor().process(src, { mode: "minify" }).code;

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
			.process("/*! k */a{color:red}", { mode: "minify" });
		expect(out).toBe("/*! k */a{color:red}");
		expect(seen).toEqual(["/*! k */"]);
	});

	it("ignores `skip` while printing (every node is needed for serialization)", () => {
		// A prelude/type skip would drop selector or value nodes; printing must
		// override it so the minified output stays complete.
		const out = new SourceProcessor().process(".a .b{color:red}", {
			mode: "minify",
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
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("separates tokens a dropped comment used to keep apart", () => {
		// Without a separator these read back as one dimension and as one ident —
		// dropping a comment must never merge the tokens it stood between.
		expect(min("a{margin:1px/**/2}")).toBe("a{margin:1px 2}");
		expect(min("@media screen/**/and/**/(min-width:1px){a{c:1}}")).toBe(
			"@media screen and (width>=1px){a{c:1}}"
		);
	});

	it("parts a selector's tokens with a comment rather than whitespace", () => {
		// Whitespace between two of a selector's tokens is a descendant combinator,
		// so the separator a fusing junction needs there is an empty comment: `a b`
		// would match what `a/**/b` (two adjacent type selectors) never does.
		expect(min("a/**/b{c:1}")).toBe("a/**/b{c:1}");
		expect(min("@scope (div/**/span){a{c:1}}")).toBe(
			"@scope (div/**/span){a{c:1}}"
		);
		// A comment the source spelled out where nothing would fuse still goes.
		expect(min("a/**/ b{c:1}")).toBe("a b{c:1}");
		// CSS Syntax 3 §4.3.10: a `+` starts a number only before a digit, or
		// before a `.` that itself has one — a class after it fuses with nothing.
		expect(min(".a+.m{c:1}")).toBe(".a+.m{c:1}");
		expect(min(".a + .m{c:1}")).toBe(".a+.m{c:1}");
		expect(min(".a+/**/.m{c:1}")).toBe(".a+.m{c:1}");
		expect(min(".a+.5m{c:1}")).toBe(".a+.5m{c:1}");
	});

	it("keeps a custom property's value as the source wrote it", () => {
		// The value is the text `getPropertyValue()` hands back, so it is not
		// rewritten — but a dropped comment leaves the boundary it stood for, which
		// is a space only where the tokens it parts would otherwise fuse.
		expect(min("a{--x:1px/*c*/2px}")).toBe("a{--x:1px 2px}");
		expect(min("a{--x:1px 1px/*c*/1px 1px}")).toBe("a{--x:1px 1px 1px 1px}");
		expect(min("a{--x:1px /*c*/ 2px}")).toBe("a{--x:1px  2px}");
		// Leading and trailing whitespace is not part of it.
		expect(min("a{--x: 1px 2px }")).toBe("a{--x:1px 2px}");
		// A `/*` inside a string is no comment.
		expect(min('a{--x:"a/*c*/b"}')).toBe('a{--x:"a/*c*/b"}');
		// A kept comment stays where it stood, so it is not also re-emitted before
		// the next top-level node — and it parts the tokens itself.
		expect(min("a{--x:1px/*!c*/2px}b{c:1}")).toBe("a{--x:1px/*!c*/2px}b{c:1}");
		expect(min("a{--x:1px/*c*//*!k*/2px}")).toBe("a{--x:1px/*!k*/2px}");
		// One rule's custom properties take their own, in the order they stand in.
		expect(
			min("/*!t*/a{--x:1px/*!k*/2px;--y:3px/*c*/4px;--z:5px/*!j*/6px}")
		).toBe("/*!t*/a{--x:1px/*!k*/2px;--y:3px 4px;--z:5px/*!j*/6px}");
		// Outside one it still moves ahead of the rule that follows it.
		expect(min("a{c:red/*!c*/}b{c:1}")).toBe("a{c:red}/*!c*/b{c:1}");
	});

	it("minifies a comment nested in a custom property's value", () => {
		// A function or block is no leaf, so the comments in one are the value's
		// too — at any depth, and in a block of every shape.
		expect(min("a{--x:foo(a/*c*/b)}")).toBe("a{--x:foo(a b)}");
		expect(min("a{--x:foo(bar(a/*c*/b))}")).toBe("a{--x:foo(bar(a b))}");
		expect(min("a{--x:[a/*c*/b]}")).toBe("a{--x:[a b]}");
		expect(min("a{--x:{a:1/*c*/2}}")).toBe("a{--x:{a:1 2}}");
		expect(min("a{--x:(a/*c*/b)}")).toBe("a{--x:(a b)}");
		// Against the delimiters nothing fuses, so the comment simply goes.
		expect(min("a{--x:foo(/*c*/a/*c*/)}")).toBe("a{--x:foo(a)}");
		expect(min("a{--x:foo(1px/*c*/2px)/*c*/bar()}")).toBe(
			"a{--x:foo(1px 2px)bar()}"
		);
		// Whitespace is a token of its own, so it is still written as it stands.
		expect(min("a{--x:foo( /*c*/ a )}")).toBe("a{--x:foo(  a )}");
		// A kept one is placed where it stood, at depth too.
		expect(min("a{--x:foo(a/*!k*/b)}")).toBe("a{--x:foo(a/*!k*/b)}");
		// A function closed at EOF has no `)` to write back.
		expect(min("a{--x:foo(a/*c*/b")).toBe("a{--x:foo(a b}");
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
		// `"bar` has no closing quote, so unquoting it would drop the `r` — the
		// quote is written back instead, which is what keeps the value `bar` once
		// the prelude's own `];` follows it. An at-rule prelude still prints at
		// EOF, unlike a qualified rule (§5.4.3).
		expect(min('@unknown [foo="bar')).toBe('@unknown [foo="bar"];');
		expect(min("@unknown [foo='bar")).toBe("@unknown [foo='bar'];");
		// The escape swallows the final quote, so this one is unterminated too.
		expect(min('@unknown [foo="bar\\"')).toBe('@unknown [foo="bar\\""];');
		// A `\` left dangling at EOF contributes nothing, so it goes rather than
		// escaping the quote written back after it.
		expect(min('@unknown [foo="bar\\')).toBe('@unknown [foo="bar"];');
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
		new SourceProcessor().process(src, { mode: "minify" }).code;

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
		new SourceProcessor().process(src, { mode: "minify" }).code;

	it("writes an An+B selector argument in its shortest spelling", () => {
		// `odd` is the one An+B a keyword names in fewer bytes; `even` is not.
		expect(min("a:nth-child(2n+1){b:c}")).toBe("a:nth-child(odd){b:c}");
		expect(min("a:nth-child(even){b:c}")).toBe("a:nth-child(2n){b:c}");
		// The microsyntax carries its own whitespace, signs and case.
		expect(min("a:nth-child(2N + 1){b:c}")).toBe("a:nth-child(odd){b:c}");
		expect(min("a:nth-child(+3){b:c}")).toBe("a:nth-child(3){b:c}");
		expect(min("a:nth-child( 3 ){b:c}")).toBe("a:nth-child(3){b:c}");
		// A step of zero selects the one child its B counts to.
		expect(min("a:nth-child(0n+3){b:c}")).toBe("a:nth-child(3){b:c}");
		// An index under 1 matches nothing, so a step forward starts at the first
		// one that does — and landing on the step itself is the bare `An`.
		expect(min("a:nth-of-type(2n-1){b:c}")).toBe("a:nth-of-type(odd){b:c}");
		expect(min("a:nth-child(3n-2){b:c}")).toBe("a:nth-child(3n+1){b:c}");
		expect(min("a:nth-child(2n+2){b:c}")).toBe("a:nth-child(2n){b:c}");
		expect(min("a:nth-child(n-5){b:c}")).toBe("a:nth-child(n){b:c}");
		// A step selecting exactly one child is the child that has its own name.
		expect(min("a:nth-child(1){b:c}")).toBe("a:first-child{b:c}");
		expect(min("a:nth-last-child(1){b:c}")).toBe("a:last-child{b:c}");
		expect(min("a:nth-of-type(1){b:c}")).toBe("a:first-of-type{b:c}");
		expect(min("a:nth-last-of-type(1){b:c}")).toBe("a:last-of-type{b:c}");
	});

	it("drops the implied universal inside a selector function", () => {
		expect(min("a:not(*.g){b:c}")).toBe("a:not(.g){b:c}");
		expect(min("a:is(*.g,*.h){b:c}")).toBe("a:is(.g,.h){b:c}");
		expect(min("a:has(*.g){b:c}")).toBe("a:has(.g){b:c}");
		// A lone universal is the selector, and a parted one is a combinator away.
		expect(min("a:not(*){b:c}")).toBe("a:not(*){b:c}");
		expect(min("a:not(* .g){b:c}")).toBe("a:not(* .g){b:c}");
		// A namespaced universal is not redundant.
		expect(min("a:not(*|*.g){b:c}")).toBe("a:not(*|*.g){b:c}");
		// A `@supports` condition tests the syntax rather than applying it.
		expect(min("@supports selector(*.a){b{c:d}}")).toBe(
			"@supports selector(*.a){b{c:d}}"
		);
	});

	it("keeps an An+B selector argument no shorter spelling reaches", () => {
		// A backward step never sweeps past what it started on.
		expect(min("a:nth-last-child(-n+3){b:c}")).toBe(
			"a:nth-last-child(-n+3){b:c}"
		);
		expect(min("a:nth-child(2n+4){b:c}")).toBe("a:nth-child(2n+4){b:c}");
		// `An+B of S` selects among S, which no plain spelling names.
		expect(min("a:nth-child(1 of .x){b:c}")).toBe("a:nth-child(1 of .x){b:c}");
		// Past the safe integer range arithmetic would print a different selector.
		expect(min("a:nth-child(2n-99999999999999999999){b:c}")).toBe(
			"a:nth-child(2n-99999999999999999999){b:c}"
		);
		expect(min("a:nth-child(99999999999999999999){b:c}")).toBe(
			"a:nth-child(99999999999999999999){b:c}"
		);
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

	it("parts an rgb()'s arguments on CSS whitespace and nothing else", () => {
		// Only tab, line feed, form feed, carriage return and space part one.
		// Anything else between two numbers leaves a declaration the engine
		// ignores, and rewriting it to a color would activate it.
		for (const code of [0x01, 0x0b, 0xa0, 0x2028]) {
			const between = String.fromCharCode(code);
			const css = `a{color:rgb(1${between}2 3 4)}`;
			expect(min(css)).toBe(css);
		}
		for (const between of ["\t", "\n", "\f", "\r", " "]) {
			expect(min(`a{color:rgb(1${between}2 3)}`)).toBe("a{color:#010203}");
		}
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
		new SourceProcessor().process(src, { mode: "minify" }).code;

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
		// One code point is a byte shorter escaped; two are not.
		expect(min('a{background:url("a b.png")}')).toBe(
			"a{background:url(a\\ b.png)}"
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

	it("closes a url() the tokenizer closed at EOF", () => {
		// Without the `)`, the `}` the printer writes next lands inside the url.
		expect(min("a{background:url(a.png")).toBe("a{background:url(a.png)}");
		// §4.3.6 reads the dangling `\` as an escape and §4.3.7 ends one at EOF with
		// U+FFFD, so the url keeps that code point rather than losing it.
		expect(min("a{background:url(a.png\\")).toBe(
			"a{background:url(a.png\uFFFD)}"
		);
		// An even run escapes itself and closes nothing.
		expect(min("a{background:url(a.png\\\\")).toBe(
			"a{background:url(a.png\\\\)}"
		);
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

	it("drops a `flex` shrink factor that is its own default", () => {
		expect(min("a{flex:0 1 auto}")).toBe("a{flex:0 auto}");
		expect(min("a{flex:1 1 0px}")).toBe("a{flex:1 0px}");
		expect(min("a{flex:2 1 50%}")).toBe("a{flex:2 50%}");
	});

	it("keeps a `flex` value no keyword spells", () => {
		// `flex:1` means `1 1 0%`, and a length `0` is not a percentage `0%`.
		expect(min("a{flex:1 1 0}")).toBe("a{flex:1 1 0}");
		expect(min("a{flex:1 1}")).toBe("a{flex:1 1}");
		// A basis a factor could be read as: CSS Flexbox 1 §7.1.1 reads a unitless
		// zero not preceded by two factors as a factor, so `1 1 0` is not `1 0`.
		expect(min("a{flex:3 1 0}")).toBe("a{flex:3 1 0}");
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

describe("CssSyntax — print modes", () => {
	/**
	 * @param {string} src css source
	 * @param {import("../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */
	const print = (src, mode) =>
		new SourceProcessor().process(src, { mode }).code;

	it("prints nothing unless output is asked for", () => {
		expect(new SourceProcessor().process(".a{color:red}")).toBeUndefined();
	});

	it("beautifies without the transforms minifying applies", () => {
		// Ugly is allowed — unindented, and top-level items still run together —
		// but nothing the author wrote may be rewritten.
		expect(
			print(
				"@media screen{.a{color:#ff0000;margin:1px 2px 1px 2px}}",
				"beautify"
			)
		).toBe(
			"@media screen {\n.a {\ncolor: #ff0000;\nmargin: 1px 2px 1px 2px;\n}\n}"
		);
		expect(
			print("@media screen{.a{color:#ff0000;margin:1px 2px 1px 2px}}", "minify")
		).toBe("@media screen{.a{color:red;margin:1px 2px}}");
		// A function's arguments keep the spacing they were written with, where
		// minifying would both drop it and fold the color.
		expect(print("a{color:rgb(1 , 2 , 3)}", "beautify")).toBe(
			"a {\ncolor: rgb(1 , 2 , 3);\n}"
		);
		expect(print("a{color:rgb(1 , 2 , 3)}", "minify")).toBe("a{color:#010203}");
	});

	it("keeps the same comments in both modes", () => {
		// A license banner survives minifying, so it has to survive beautifying —
		// otherwise the two modes disagree about what the stylesheet says.
		expect(print("/*!keep*/.a{color:red}/* drop */", "beautify")).toBe(
			"/*!keep*/.a {\ncolor: red;\n}"
		);
		expect(print("/*!keep*/.a{color:red}/* drop */", "minify")).toBe(
			"/*!keep*/.a{color:red}"
		);
	});

	it("does not emit a custom property's kept comment twice", () => {
		// The value prints straight from source, comments and all, so beautifying
		// has to claim them the way minifying does or they land again before the
		// next top-level rule.
		expect(print(".a{--x:1px /*!k*/ 2px}.b{color:red}", "beautify")).toBe(
			".a {\n--x: 1px /*!k*/ 2px;\n}.b {\ncolor: red;\n}"
		);
	});

	it("beautifies to something that minifies back the same", () => {
		for (const src of [
			"/*!k*/.a{color:#ff0000}",
			"@media screen{.a{margin:1px 2px 1px 2px}.b{color:red}}",
			".a{--x:1px /*!k*/ 2px}.b{content:'y'}",
			"@supports (a:b){.a{&:hover{color:red}}}",
			".a{transition:all 500ms}@import url(x.css);"
		]) {
			const minified = print(src, "minify");
			expect(print(print(src, "beautify"), "minify")).toBe(minified);
		}
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
		new SourceProcessor().process(css, { mode: "minify", environment }).code;

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
			mode: "minify",
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
			[".005s", "5ms"],
			// A zero time keeps a unit where a zero length drops one, so the shorter
			// of the two it can carry is still worth reaching for.
			["0ms", "0s"],
			["-0ms", "0s"]
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
				{ mode: "minify", convertLengthUnits: true }
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
			// `hue-rotate` goes further still — see the omitted-argument tests.
			["a{transform:rotate(0turn)}", "a{transform:rotate(0)}"]
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
			// A scaled axis names the same one but is not folded, so the angle still
			// sits last here.
			["that call's own angle sits last", "a{transform:rotate3d(0,0,2,0deg)}"],
			["the function takes no <zero>", "a{transition-duration:0s}"],
			["it is not a function argument", "a{width:0deg}"]
		])("keeps the unit where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a value the property's own grammar already implies", () => {
		it.each([
			// One `<repeat-style>` value is what two equal ones say.
			["a{background-repeat:repeat repeat}", "a{background-repeat:repeat}"],
			[
				"a{background-repeat:no-repeat no-repeat}",
				"a{background-repeat:no-repeat}"
			],
			["a{mask-repeat:round round}", "a{mask-repeat:round}"],
			// `initial` computes to the initial value, which is often a shorter word.
			["a{min-width:initial}", "a{min-width:auto}"],
			["a{outline-width:initial}", "a{outline-width:medium}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the two values differ", "a{background-repeat:repeat no-repeat}"],
			["only one axis is centered", "a{background-position:center 10px}"],
			["the initial value is no shorter", "a{color:initial}"],
			["a shorthand states no value of its own", "a{margin:initial}"],
			["it is a custom property's value", "a{--x:initial}"],
			// The production also sits in shorthands, where a repeated value is some
			// other slot — and `background: red red` is a declaration the engine
			// drops, not one to make valid.
			["the pair is not a repeat style", "a{background:red red}"],
			["the pair is a shorthand's other slot", "a{mask:none none}"],
			// `repeat-x` is the one-value spelling of a pair, so it never doubles.
			["the keyword never pairs", "a{background-repeat:repeat-x repeat-x}"],
			// `mdn-data` states `black` as this one's initial, which it cannot take.
			[
				"the stated initial is not a value it takes",
				"a{flood-opacity:initial}"
			],
			["the same, on the other opacity", "a{stop-opacity:initial}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a position written as edge keywords", () => {
		it.each([
			["a{background-position:center}", "a{background-position:50%}"],
			["a{background-position:center center}", "a{background-position:50%}"],
			["a{background-position:left}", "a{background-position:0%}"],
			["a{background-position:right}", "a{background-position:100%}"],
			["a{background-position:left center}", "a{background-position:0%}"],
			["a{background-position:left top}", "a{background-position:0%0%}"],
			// `<position>`'s keyword pair is order-free, so both readings resolve.
			["a{background-position:top left}", "a{background-position:0%0%}"],
			["a{background-position:left bottom}", "a{background-position:0%100%}"],
			[
				"a{background-position:center bottom}",
				"a{background-position:50%100%}"
			],
			[
				"a{background-position:right bottom}",
				"a{background-position:100%100%}"
			],
			["a{background-position:LEFT BOTTOM}", "a{background-position:0%100%}"],
			["a{object-position:left top}", "a{object-position:0%0%}"],
			["a{mask-position:left top}", "a{mask-position:0%0%}"],
			["a{perspective-origin:left top}", "a{perspective-origin:0%0%}"],
			// `transform-origin` spells its axes out rather than naming a position,
			// and a depth only follows a third component.
			["a{transform-origin:left top}", "a{transform-origin:0%0%}"],
			["a{transform-origin:center bottom}", "a{transform-origin:50%100%}"],
			["a{offset-anchor:left top}", "a{offset-anchor:0%0%}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// `top` is `50% 0%`, which the keyword already says in fewer bytes.
			["the percentages are no shorter", "a{background-position:top}"],
			["the same, on the other edge", "a{background-position:bottom}"],
			// An offset beside a keyword is the 3/4-value syntax, where the keyword
			// names the edge to measure from rather than a place on the axis.
			["an offset follows a keyword", "a{background-position:left 10px}"],
			[
				"both axes carry an offset",
				"a{background-position:left 10px top 20px}"
			],
			["a comma parts two layers", "a{background-position:left top,right top}"],
			["the two keywords share an axis", "a{background-position:left right}"],
			["the same, on the other axis", "a{background-position:top bottom}"],
			// A third component is `transform-origin`'s z offset, which the two-value
			// collapse has no reading of.
			["a depth follows the position", "a{transform-origin:left top 10px}"],
			["the position is a shorthand's slot", "a{background:left top}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a position whose second value is the centre", () => {
		it.each([
			["a{background-position:50% 50%}", "a{background-position:50%}"],
			["a{background-position:10px center}", "a{background-position:10px}"],
			["a{background-position:left 50%}", "a{background-position:left}"],
			["a{background-position:0 center}", "a{background-position:0}"],
			["a{object-position:25% 50%}", "a{object-position:25%}"],
			["a{mask-position:3em center}", "a{mask-position:3em}"],
			["a{transform-origin:50% 50%}", "a{transform-origin:50%}"],
			["a{transform-origin:10px center}", "a{transform-origin:10px}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// `top` is no x-position, so the pair is the order-free keyword syntax
			// and half of it alone would be a value the engine drops.
			[
				"the first value is on the other axis",
				"a{background-position:top 50%}"
			],
			["the second value is no centre", "a{background-position:10px 20px}"],
			["both axes carry an offset", "a{background-position:left 1em top 50%}"],
			["the property is no position", "a{background-repeat:round center}"],
			["the position is a shorthand's slot", "a{background:10px center}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a shorthand slot holding its own initial", () => {
		it.each([
			["a{transition:height .35s ease}", "a{transition:height.35s}"],
			["a{transition:opacity 1s ease 2s}", "a{transition:opacity 1s 2s}"],
			["a{transition:all 1s ease}", "a{transition:all 1s}"],
			["a{transition:opacity 1s normal}", "a{transition:opacity 1s}"],
			// A comma parts two layers, and each holds its own set of slots.
			[
				"a{transition:opacity 1s ease,color 1s ease}",
				"a{transition:opacity 1s,color 1s}"
			],
			[
				"a{transition:all .3s cubic-bezier(.4,0,.2,1),color .2s ease}",
				"a{transition:all.3s cubic-bezier(.4,0,.2,1),color.2s}"
			],
			// Only the layer whose slots are unambiguous gives its keyword up.
			[
				"a{transition:opacity 1s ease,ease 1s ease}",
				"a{transition:opacity 1s,ease 1s ease}"
			],
			[
				"a{transition:1s ease color,2s opacity}",
				"a{transition:color 1s,opacity 2s}"
			],
			["a{animation:x 1s ease}", "a{animation:x 1s}"],
			["a{animation:x 2s ease normal running}", "a{animation:x 2s}"],
			["a{border:2px none red}", "a{border:2px red}"],
			["a{column-rule:medium none red}", "a{column-rule:medium red}"],
			["a{outline:medium none}", "a{outline:medium}"],
			["a{flex-flow:row wrap}", "a{flex-flow:wrap}"],
			// Both slots hold their initial, so the shortest one says both — whichever
			// order they were written in.
			["a{flex-flow:row nowrap}", "a{flex-flow:row}"],
			["a{flex-flow:nowrap row}", "a{flex-flow:row}"],
			["a{border:none medium}", "a{border:medium}"],
			["a{list-style:disc outside}", "a{list-style:disc}"],
			["a{mask:url(a.svg) match-source add}", "a{mask:url(a.svg)}"],
			[
				"a{border-image:url(a.png) 30% stretch}",
				"a{border-image:url(a.png)30%}"
			],
			["a{text-decoration:none solid red}", "a{text-decoration:red}"],
			// A slot of keywords and calls — `<bg-image>` is `none` or an image
			// function — is checked for a sibling like a keywords-only one.
			["a{background:none #fff}", "a{background:#fff}"],
			["a{background:#fff none}", "a{background:#fff}"],
			["a{background:red scroll}", "a{background:red}"],
			["a{background:red repeat}", "a{background:red}"],
			["a{background:none red repeat scroll}", "a{background:red}"],
			// `background-origin` and `background-clip` are two slots of one
			// production, so neither of their initials is the one slot's own.
			[
				"a{background:padding-box border-box none}",
				"a{background:padding-box border-box}"
			],
			["a{border-image:none 30}", "a{border-image:30}"],
			["a{mask:none luminance}", "a{mask:luminance}"],
			["a{TRANSITION:opacity 1s EASE}", "a{TRANSITION:opacity 1s}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			[
				"the keyword is not the initial",
				"a{transition:height .35s ease-in-out}"
			],
			// `none` is both an animation name and a fill mode, so which slot it
			// fills is not a question the grammar answers.
			["two slots name the keyword", "a{animation:x 1s none}"],
			["the same, on a list style", "a{list-style:none}"],
			// `mask: url(…) none` fills `<mask-reference>` twice and is a declaration
			// the engine drops — removing the `none` would revive it.
			["a sibling fills the same slot", "a{mask:url(a.svg) none}"],
			// A function fills the easing slot as much as a keyword does.
			["a call fills the same slot", "a{transition:opacity 1s ease steps(4)}"],
			["the same, on an animation", "a{animation:x 1s ease linear(0,1)}"],
			["the value is the keyword alone", "a{border:none}"],
			// Each layer keeps its own siblings, so the ambiguous one stays whole.
			[
				"a layer's own sibling fills the slot",
				"a{transition:ease 1s ease,ease 2s ease}"
			],
			// A string could carry the comma the layer split reads.
			["a layer holds a string", 'a{transition:"a" 1s ease}'],
			["a layer is empty", "a{transition:opacity 1s ease,,color 2s ease}"],
			["the first layer is empty", "a{transition:,opacity 1s ease}"],
			["the last layer is empty", "a{transition:opacity 1s ease,}"],
			["the property is no shorthand", "a{border-style:none}"],
			// `<line-width>` reaches `<length>`, which no spelling names, so a
			// sibling filling that slot cannot be recognized.
			[
				"the slot takes a value no spelling names",
				"a{border:medium solid red}"
			],
			// An image function fills `<bg-image>` as much as `none` does.
			["a call fills the image slot", "a{background:none url(a.png)}"],
			[
				"the same, past a gradient",
				"a{background:none linear-gradient(red,blue)}"
			],
			["a background is the keyword alone", "a{background:none}"],
			["a background states two layers", "a{background:none,url(a.png)}"],
			// A `/` reaches a slot through another's value, so the components are no
			// longer this one flat list.
			["a background states a size", "a{background:none 50%/cover}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a font-stretch keyword", () => {
		it.each([
			["a{font-stretch:ultra-condensed}", "a{font-stretch:50%}"],
			["a{font-stretch:condensed}", "a{font-stretch:75%}"],
			["a{font-stretch:semi-condensed}", "a{font-stretch:87.5%}"],
			["a{font-stretch:normal}", "a{font-stretch:100%}"],
			["a{font-stretch:expanded}", "a{font-stretch:125%}"],
			["a{font-stretch:ultra-expanded}", "a{font-stretch:200%}"],
			["a{font-stretch:CONDENSED}", "a{font-stretch:75%}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the value is already a percentage", "a{font-stretch:75%}"],
			["it is a custom property's value", "a{--x:condensed}"],
			["the value holds a substitution", "a{font-stretch:var(--x,condensed)}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a filter function's omitted argument", () => {
		it.each([
			["a{filter:grayscale(1)}", "a{filter:grayscale()}"],
			["a{filter:grayscale(100%)}", "a{filter:grayscale()}"],
			["a{filter:invert(1)}", "a{filter:invert()}"],
			["a{filter:blur(0)}", "a{filter:blur()}"],
			// The zero still carries the unit its own grammar drops.
			["a{filter:blur(0px)}", "a{filter:blur()}"],
			["a{filter:hue-rotate(0deg)}", "a{filter:hue-rotate()}"],
			["a{filter:hue-rotate(0turn)}", "a{filter:hue-rotate()}"],
			["a{backdrop-filter:saturate(1)}", "a{backdrop-filter:saturate()}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the amount is not the omitted one", "a{filter:grayscale(0)}"],
			["the same, as a percentage", "a{filter:grayscale(50%)}"],
			// The engine drops both of these, so folding them would revive one.
			["a percentage is no length", "a{filter:blur(0%)}"],
			["an angle is no length either", "a{filter:blur(0deg)}"],
			[
				"the function takes no optional argument",
				"a{filter:drop-shadow(0 0 1px red)}"
			],
			["a substitution stands there", "a{filter:grayscale(var(--x))}"]
		])("keeps the value where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("adjacent rules printing the same block", () => {
		it.each([
			["a{color:red}b{color:red}", "a,b{color:red}"],
			["a{color:red}b{color:red}c{color:red}", "a,b,c{color:red}"],
			[".a[x=1]{top:0}.b>.c{top:0}", ".a[x=1],.b>.c{top:0}"],
			// A `:` an ident escapes, and one an attribute's string holds, both sit
			// in a selector every engine parses — only a pseudo keeps a rule out.
			[".sm\\:flex{top:0}.b{top:0}", ".sm\\:flex,.b{top:0}"],
			['[href="a:b"]{top:0}.b{top:0}', '[href="a:b"],.b{top:0}'],
			["@media x{a{top:0}b{top:0}}", "@media x{a,b{top:0}}"],
			["@keyframes k{0%{top:0}50%{top:0}}", "@keyframes k{0%,50%{top:0}}"],
			// The rule between them prints nothing, so they end up adjacent.
			["a{color:red}i{}b{color:red}", "a,b{color:red}"],
			// The same selector twice is one rule: its declarations are read in the
			// order they were written either way.
			["a{color:red}a{margin:0}", "a{color:red;margin:0}"],
			[":root{--a:1}:root{--b:2}", ":root{--a:1;--b:2}"],
			// The prelude does not change, so neither of the two shapes that keep a
			// selector out of another's list keeps it out of this.
			[
				":local(.x){color:red}:local(.x){margin:0}",
				":local(.x){color:red;margin:0}"
			],
			[
				"a{color:red}a{&:hover{color:blue}}",
				"a{color:red;&:hover{color:blue}}"
			],
			// Only the last of a set of identical declarations can be read.
			["a{color:red}a{color:red}", "a{color:red}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the blocks differ", "a{color:red}b{color:blue}"],
			["a rule stands between them", "a{color:red}i{top:0}b{color:red}"],
			// One selector the engine cannot parse invalidates the whole list.
			["a pseudo may be one the engine drops", "a:hover{top:0}b:hover{top:0}"],
			["...even beside an attribute selector", "[a=b]:hover{top:0}.b{top:0}"],
			["...including a prefixed one", "a{top:0}::-moz-placeholder{top:0}"],
			["...or a CSS modules one", "body{top:0}:local(.x){top:0}"],
			["the parser passed a shape through", "a{top:0}. b{top:0}"],
			// `:is(a,b)` takes the specificity of its most specific selector.
			[
				"a nested rule would be re-parented",
				"a{top:0;& i{top:1px}}b{top:0;& i{top:1px}}"
			],
			["a kept comment sits between them", "a{color:red}/*! c */b{color:red}"],
			// The `s` modifier is one an engine may not read, and one selector it
			// drops invalidates the whole list it was joined into.
			["a matcher carries a modifier past `i`", "[a=b s]{top:0}[c]{top:0}"]
		])("keeps both rules where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		it.each([
			// One block holds a property once, so the earlier declaration of a
			// property both of them set would be the one it loses.
			["they set the same property", "a{color:red}a{color:blue}"],
			["...whatever its case", "a{color:red}a{COLOR:blue}"],
			// A shorthand holds every longhand its name prefixes.
			[
				"one holds the other's longhand",
				"a{background:red}a{background-image:none}"
			],
			["one is `all`", "a{all:initial}a{color:red}"],
			// The declarations after it are the implicit `& {…}` the engine builds.
			[
				"the earlier block holds a rule",
				"a{color:red;&:hover{top:0}}a{margin:0}"
			]
		])("keeps the same selector's two rules where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		it.each([
			["a{.x{top:0}.y{top:0}}", "a{.x,.y{top:0}}"],
			["a{&.x{top:0}&.y{top:0}}", "a{&.x,&.y{top:0}}"],
			["a{& .x{top:0}& .y{top:0}}", "a{& .x,& .y{top:0}}"],
			["a{&{top:0}.y{top:0}}", "a{&,.y{top:0}}"]
		])("joins nested rules: %s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// The two blocks' own rules come to stand beside each other, so the pair
			// meeting at the seam is offered the same join.
			["@media x{a{top:0}}@media x{b{top:0}}", "@media x{a,b{top:0}}"],
			[
				"@supports (a:b){i{t:0}}@supports (a:b){j{t:0}}",
				"@supports (a:b){i,j{t:0}}"
			],
			["a{@media x{.p{t:0}}@media x{.q{t:0}}}", "a{@media x{.p,.q{t:0}}}"],
			// Declarations join too, and the one that is no longer last drops the
			// `;` its own `}` had made redundant.
			["a{@media x{c:1}@media x{d:2}}", "a{@media x{c:1;d:2}}"],
			[
				"a{@media x{c:1}@media x{d:2}@media x{e:3}}",
				"a{@media x{c:1;d:2;e:3}}"
			],
			[
				"a{@media x{c:1}@media x{d:2}color:red}",
				"a{@media x{c:1;d:2}color:red}"
			],
			// ...at every depth, an at-rule at the seam joining like any other rule.
			[
				"@media a{@media b{.x{t:0}}}@media a{@media b{.y{t:0}}}",
				"@media a{@media b{.x,.y{t:0}}}"
			],
			// Only the pair at the seam is new; the rest of each block is joined.
			[
				"@media x{a{t:0}b{c:d}}@media x{i{c:d}j{t:1px}}",
				"@media x{a{t:0}b,i{c:d}j{t:1px}}"
			],
			[
				"@media x{a{t:0}}@media x{b{c:d}}@media x{i{c:d}}",
				"@media x{a{t:0}b,i{c:d}}"
			],
			// The seam pair shares a selector, so the two blocks are one rule.
			["@media x{a{t:0}}@media x{a{c:d}}", "@media x{a{t:0;c:d}}"]
		])("joins the blocks of one condition: %s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// The seam pair is held to the same rules as any other adjacency.
			[
				"the seam rules print different blocks",
				"@media x{a{t:0}}@media x{b{c:d}}",
				"@media x{a{t:0}b{c:d}}"
			],
			[
				"a seam rule holds a nested rule",
				"@media x{a{t:0;& i{t:1px}}}@media x{b{t:0;& i{t:1px}}}",
				"@media x{a{t:0;& i{t:1px}}b{t:0;& i{t:1px}}}"
			]
		])("joins the blocks but not the seam where %s", (_name, css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the conditions differ", "@media x{a{top:0}}@media y{b{top:0}}"],
			// A later `@keyframes` of the same name replaces the earlier one.
			[
				"the prelude names what the block belongs to",
				"@keyframes k{0%{top:0}}@keyframes k{50%{top:1px}}"
			],
			["a rule stands between them", "@media x{a{t:0}}i{c:d}@media x{b{t:0}}"],
			// `@layer a{}` declares where the layer sits in the cascade.
			["one block is empty", "@layer a{}@layer a{i{t:0}}"]
		])("keeps both at-rules where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		it.each([
			// Only a rule nested in another: at the top level an engine that cannot
			// read `&` still reads whatever it would be joined to.
			["`&` stands at the top level", "&.x{top:0}&.y{top:0}"],
			[
				"a nested rule of its own would be re-parented",
				"a{.x{top:0;i{top:1px}}.y{top:0;i{top:1px}}}"
			]
		])("keeps both nested rules where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a shadow's trailing zero lengths", () => {
		it.each([
			[
				"a{box-shadow:0 0 0 0 #22242626 inset}",
				"a{box-shadow:0 0#22242626 inset}"
			],
			["a{box-shadow:-1px 0 0 0 #bababc}", "a{box-shadow:-1px 0#bababc}"],
			["a{box-shadow:inset 0 0 0 0 red}", "a{box-shadow:inset 0 0 red}"],
			["a{box-shadow:1px 2px 3px 0 red}", "a{box-shadow:1px 2px 3px red}"],
			["a{text-shadow:1px 1px 0 red}", "a{text-shadow:1px 1px red}"],
			[
				"a{box-shadow:0 0 0 0 red,1px 1px 0 0 blue}",
				"a{box-shadow:0 0 red,1px 1px blue}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// The two offsets are what the grammar makes mandatory.
			["the two offsets are all there is", "a{box-shadow:0 0 red}"],
			["a length past them is not zero", "a{box-shadow:0 0 0 1px red}"],
			["the value is a keyword", "a{box-shadow:none}"],
			["the property states no shadow", "a{stroke-dasharray:1 0 0}"],
			["a layer holds a string", 'a{box-shadow:0 0 0 0 red,"a"}'],
			// A comma with nothing either side is a layer no shadow fills.
			["a trailing comma parts an empty layer", "a{box-shadow:0 0 0 0 red,}"],
			["a leading comma does the same", "a{box-shadow:,0 0 0 0 red}"]
		])("keeps the value where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("the whitespace between two calls", () => {
		it.each([
			[
				"a{transform:scale(2) rotate(45deg)}",
				"a{transform:scale(2)rotate(45deg)}"
			],
			[
				"a{transform:scale(.85) translateY(-.5rem) rotate(45deg)}",
				"a{transform:scale(.85)translateY(-.5rem)rotate(45deg)}"
			],
			// Grammar matching skips whitespace whatever the property, which is what
			// reaches the prefixed spellings no dataset names.
			[
				"a{-webkit-transform:translateY(-14px) scale(.8)}",
				"a{-webkit-transform:translateY(-14px)scale(.8)}"
			],
			["a{filter:brightness(0) invert(1)}", "a{filter:brightness(0)invert()}"],
			[
				"a{-webkit-filter:blur(2px) saturate(2)}",
				"a{-webkit-filter:blur(2px)saturate(2)}"
			],
			[
				"a{backdrop-filter:blur(2px) saturate(2)}",
				"a{backdrop-filter:blur(2px)saturate(2)}"
			],
			[
				"a{grid-template-columns:repeat(2,1fr) minmax(0,1fr)}",
				"a{grid-template-columns:repeat(2,1fr)minmax(0,1fr)}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the value is a keyword", "a{transform:none}"],
			["a component is no call", "a{background:red repeat-x}"],
			["the same, past a call", "a{mask:url(a.svg) none}"],
			["there is one component", "a{filter:blur(2px)}"]
		])("keeps the value where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a comment parting two components", () => {
		// The comment ends both tokens, so a rewritten value has to keep them apart.
		it.each([
			["a{margin:1px 1px/*c*/1px 1px}", "a{margin:1px}"],
			["a{margin:1px/*c*/2px 1px 2px}", "a{margin:1px 2px}"],
			["a{box-shadow:1px 1px/*c*/2px 0 red}", "a{box-shadow:1px 1px 2px red}"],
			[
				"a{transition:opacity/*c*/1s ease-in 2s}",
				"a{transition:opacity 1s 2s ease-in}"
			],
			["a{background-position:left/*c*/top}", "a{background-position:0%0%}"],
			[
				"a{grid-template-columns:1fr/*c*/1fr}",
				"a{grid-template-columns:1fr 1fr}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});
	});

	describe("a value holding a substitution", () => {
		// The engine keeps such a value as the token stream it was written as until
		// the substitution resolves, so every rewrite inside one is declined.
		it.each([
			["a named color", "a{background-color:var(--a,var(--b,white))}"],
			["a transform", "a{transform:var(--a) translate(0,10px)}"],
			["a font family", 'a{font-family:var(--x),"Foo Bar"}'],
			["a url()", 'a{background:var(--a) url("a b.png")}'],
			["a repeated pair", "a{background-repeat:var(--x) var(--x)}"],
			["a two-keyword display", "a{display:var(--x) flow}"],
			["an `initial`", "a{min-width:var(--x,initial)}"],
			["the font shorthand's weight", "a{font:bold var(--s1) Arial}"],
			["a transition's slots", "a{transition:var(--p) 2s opacity}"],
			["`transparent`", "a{color:var(--x,transparent)}"],
			["a `translateX()`", "a{transform:var(--a) translateX(1px)}"],
			["a zero angle", "a{transform:var(--a) rotate(0deg)}"]
		])("keeps %s as written", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a url() whose quotes an escape replaces", () => {
		it.each([
			['a{background:url("a b.png")}', "a{background:url(a\\ b.png)}"],
			['a{background:url("a(b.png")}', "a{background:url(a\\(b.png)}"],
			['a{background:url("a)b.png")}', "a{background:url(a\\)b.png)}"],
			["a{background:url('a b.png')}", "a{background:url(a\\ b.png)}"],
			['a{background:url("a\'b.png")}', "a{background:url(a\\'b.png)}"],
			['a{background:url("http://x/y z")}', "a{background:url(http://x/y\\ z)}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// Two escapes cost the two bytes the quotes did, so nothing is saved.
			["two code points need escaping", 'a{background:url("a b c.png")}'],
			// A control code point takes a hex escape, which is never shorter.
			["a control code point stands there", 'a{background:url("a\tb.png")}']
		])("keeps the quotes where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a data URI's percent-escapes", () => {
		it.each([
			[
				'a{background:url("data:image/svg+xml,%3csvg%20fill=%27red%27%3e%3c/svg%3e")}',
				"a{background:url(\"data:image/svg+xml,<svg fill='red'></svg>\")}"
			],
			[
				'a{background:url("data:image/png;base64,AAA%3D")}',
				"a{background:url(data:image/png;base64,AAA=)}"
			],
			// Decoding leaves a body the url-token spelling can carry.
			[
				'a{background:url("data:text/plain,a%2Cb")}',
				"a{background:url(data:text/plain,a,b)}"
			],
			// A url written as a url-token decodes too, keeping only the bytes the
			// token cannot carry — there are no quotes here to hold them.
			[
				"a{background:url(data:image/svg+xml,%3csvg%20fill=%27red%27%3e%3c/svg%3e)}",
				"a{background:url(data:image/svg+xml,<svg%20fill=%27red%27></svg>)}"
			],
			[
				"a{background:url(data:image/png;base64,AAA%3D)}",
				"a{background:url(data:image/png;base64,AAA=)}"
			],
			// Each escape names one byte: `%C3%A9` is the two of `é`, and writing
			// them apart would re-encode as four.
			[
				'a{background:url("data:image/svg+xml,%3Csvg%3E%C3%A9%3C/svg%3E")}',
				"a{background:url(data:image/svg+xml,<svg>%C3%A9</svg>)}"
			],
			[
				'a{background:url("data:text/plain,%7F%20a")}',
				"a{background:url(data:text/plain,%7F\\ a)}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// An escape the url-token already carries is one this printer did not
			// write, so its `\%` is not read as the start of a percent-escape.
			["a url-token carries an escape", "a{background:url(data:t,a\\%20b%3c)}"],
			["it is no data URI", "a{background:url(x.png?a=%26b)}"],
			["it holds no escape at all", "a{background:url(data:t,ab)}"]
		])("keeps a url-token as written where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		it.each([
			// Outside a data URI's payload an escape is structure, not content:
			// `%26` in a query is a literal `&`, not a separator.
			[
				"it is a query's value",
				'a{background:url("x.png?a=%26b")}',
				"a{background:url(x.png?a=%26b)}"
			],
			[
				"it is a path segment",
				'a{background:url("a%2Fb.png")}',
				"a{background:url(a%2Fb.png)}"
			],
			[
				"it is the data URI's own metadata",
				'a{background:url("data:x%2Fy,z")}',
				"a{background:url(data:x%2Fy,z)}"
			],
			// `#` would start the fragment and `%` the next escape.
			[
				"the byte would start a fragment",
				'a{background:url("data:t,a%23b")}',
				"a{background:url(data:t,a%23b)}"
			],
			[
				"the byte would start an escape",
				'a{background:url("data:t,a%25b")}',
				"a{background:url(data:t,a%25b)}"
			],
			[
				"the byte is a control code point",
				'a{background:url("data:t,a%00b")}',
				"a{background:url(data:t,a%00b)}"
			],
			[
				"the byte would end the string",
				'a{background:url("data:t,a%22b")}',
				"a{background:url(data:t,a%22b)}"
			],
			[
				"the byte would extend the escape",
				'a{background:url("data:t,a%5Cb")}',
				"a{background:url(data:t,a%5Cb)}"
			]
		])("keeps them where %s", (_name, css, expected) => {
			expect(minify(css)).toBe(expected);
		});
	});

	describe("a two-keyword display naming one box", () => {
		it.each([
			["a{display:inline flow-root}", "a{display:inline-block}"],
			["a{display:block flow}", "a{display:block}"],
			// `<display-outside> || <display-inside>` is order-free.
			["a{display:flow block}", "a{display:block}"],
			["a{display:block table}", "a{display:table}"],
			["a{display:inline flow}", "a{display:inline}"],
			// `ruby` is the one inside whose own default outside is `inline`.
			["a{display:inline ruby}", "a{display:ruby}"],
			["a{display:run-in flow}", "a{display:run-in}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// `inline-table` is no shorter than the two keywords it stands for.
			["the short form saves nothing", "a{display:inline table}"],
			["it is already one keyword", "a{display:flex}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("the font shorthand's weight", () => {
		it.each([
			["a{font:bold 12px/1.5 Arial}", "a{font:700 12px/1.5 Arial}"],
			["a{font:italic bold 12px Arial}", "a{font:italic 700 12px Arial}"],
			["a{font:bold small Arial}", "a{font:700 small Arial}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// The family only ever follows the size, so this `bold` is a family name.
			["no size follows it", "a{font:12px bold}"],
			["there is no size at all", "a{font:bold}"]
		])("keeps the word where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a transition written in slot order", () => {
		it.each([
			["a{transition:ease-in 2s opacity}", "a{transition:opacity 2s ease-in}"],
			["a{transition:2s opacity}", "a{transition:opacity 2s}"],
			// The first time is the duration and the second the delay, both kept.
			["a{transition:2s 1s opacity}", "a{transition:opacity 2s 1s}"],
			[
				"a{transition:allow-discrete 2s opacity}",
				"a{transition:opacity 2s allow-discrete}"
			],
			// The easing slot holds its own initial, so it goes before the reorder.
			["a{transition:ease 2s}", "a{transition:2s}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["it is already in order", "a{transition:opacity 2s ease-in}"],
			["a substitution stands there", "a{transition:var(--x) 2s}"],
			["two layers are written", "a{transition:opacity 2s,color 3s}"],
			["there is one component", "a{transition:none}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a font family the quotes carry nothing for", () => {
		it.each([
			[
				'a{font-family:"Helvetica Neue",Arial}',
				"a{font-family:Helvetica Neue,Arial}"
			],
			['a{font-family:"Arial"}', "a{font-family:Arial}"],
			[
				'a{font-family:"Foo Bar","sans-serif"}',
				'a{font-family:Foo Bar,"sans-serif"}'
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// Unquoted, each of these would read as the grammar's own keyword.
			["it is a generic family", 'a{font-family:"serif"}'],
			["it is a CSS-wide keyword", 'a{font-family:"inherit"}'],
			// …and each of these is text no identifier run could spell.
			["a word starts with a digit", 'a{font-family:"1st Ave"}'],
			["a word is no identifier", 'a{font-family:"a.b"}'],
			["two spaces part its words", 'a{font-family:"My  Font"}'],
			// The family slot of the shorthand is read among the other slots.
			["it is the `font` shorthand", 'a{font:12px "Foo Bar"}'],
			["the property takes a string", 'a{content:"Foo Bar"}'],
			["it is a custom property's value", 'a{--x:"Foo Bar"}']
		])("keeps the quotes where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a component spelling the property's own initial", () => {
		it.each([
			["a{grid-auto-flow:row dense}", "a{grid-auto-flow:dense}"],
			["a{grid-auto-flow:dense row}", "a{grid-auto-flow:dense}"],
			["a{grid-auto-flow:ROW dense}", "a{grid-auto-flow:dense}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// The other alternative of the group is not the initial.
			["it is not the initial", "a{grid-auto-flow:column dense}"],
			// Nothing else stands beside it, so it is the whole value.
			["it stands alone", "a{grid-auto-flow:row}"],
			// `aspect-ratio:auto <ratio>` is a ratio with a fallback, not the ratio.
			["the keyword still says something", "a{aspect-ratio:auto 3}"],
			// A substitution could expand to anything.
			["a substitution stands there", "a{grid-auto-flow:var(--x) dense}"]
		])("keeps the value where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a selector list as the set it is", () => {
		it.each([
			["b,a{color:red}", "a,b{color:red}"],
			// A repeat matches nothing the first one did not.
			["a,a,b{color:red}", "a,b{color:red}"],
			[".a,.a{top:0}", ".a{top:0}"],
			["h6,.h6,h5,.h5{top:0}", ".h5,.h6,h5,h6{top:0}"],
			["@media print{z,a{top:0}}", "@media print{a,z{top:0}}"],
			// A nested rule's list is one too.
			["a{& d,& c{top:0}}", "a{& c,& d{top:0}}"],
			// Two rules reaching the same set are one rule once both are in order.
			["a,b{color:red}b,a{top:0}", "a,b{color:red;top:0}"],
			["z{color:red}a{color:red}", "z,a{color:red}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// Only the list's own commas split it.
			["the comma is inside `:is()`", ":is(b,a) c,d{top:0}"],
			["the comma is inside an attribute value", 'a[title="x,y"],b{top:0}'],
			["the list is already in order", "*,:after,:before{top:0}"],
			// A keyframe selector list is printed by its own rule.
			["it is a keyframe selector", "@keyframes k{50%,0%{top:0}}"]
		])("keeps the list where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		// A join concatenates: canonicalizing there would re-read the whole list
		// once per rule joined, and no real stylesheet loses a byte to the repeat.
		it("leaves a selector a join seam repeats", () => {
			expect(minify(".b{x:1}.a{x:1}.b{x:1}")).toBe(".b,.a,.b{x:1}");
		});
	});

	describe("a transform naming the same matrix", () => {
		it.each([
			["a{transform:translate(0,10px)}", "a{transform:translateY(10px)}"],
			["a{transform:translate(10px,0)}", "a{transform:translate(10px)}"],
			["a{transform:translate3d(0,0,5px)}", "a{transform:translateZ(5px)}"],
			[
				"a{transform:translate3d(1px,2px,0)}",
				"a{transform:translate(1px,2px)}"
			],
			["a{transform:scale(2,2)}", "a{transform:scale(2)}"],
			// CSS Transforms 2 §13.1: a rotation about one axis is the call naming it.
			["a{transform:rotateZ(37deg)}", "a{transform:rotate(37deg)}"],
			["a{transform:rotate3d(0,0,1,37deg)}", "a{transform:rotate(37deg)}"],
			["a{transform:rotate3d(1,0,0,37deg)}", "a{transform:rotateX(37deg)}"],
			["a{transform:rotate3d(0,1,0,37deg)}", "a{transform:rotateY(37deg)}"],
			// A z factor of 1 scales nothing along it, leaving the 2D scale.
			["a{transform:scale3d(2,3,1)}", "a{transform:scale(2,3)}"],
			// One reduction uncovers the next: the 2D call it leaves reduces too.
			["a{transform:scale3d(1,1,1)}", "a{transform:scale(1)}"],
			["a{transform:translate3d(-50%,0,0)}", "a{transform:translate(-50%)}"],
			// CSS Transforms 2 §12: a 3D matrix whose third row and column are the
			// identity's is the 2D matrix of the six values it leaves.
			[
				"a{transform:matrix3d(20,20,0,0,40,40,0,0,0,0,1,0,80,80,0,1)}",
				"a{transform:matrix(20,20,40,40,80,80)}"
			],
			// A 2D pair of 1 scales nothing there, leaving the z scale.
			["a{transform:scale3d(1,1,1.5)}", "a{transform:scaleZ(1.5)}"],
			// `skewX(a)` is `skew(a)`: the second component defaults to 0.
			["a{transform:skewX(10deg)}", "a{transform:skew(10deg)}"],
			["a{transform:skewX(0)}", "a{transform:skew(0)}"],
			// A factor of 1 scales nothing along its axis.
			["a{transform:scale(1,-1)}", "a{transform:scaleY(-1)}"],
			["a{transform:scale(-1,1)}", "a{transform:scaleX(-1)}"],
			["a{transform:scale(1,.5)}", "a{transform:scaleY(.5)}"],
			// A translation is a `<length-percentage>`, so a zero of either kind is
			// the same no-op — a percentage resolves against the element's own size.
			["a{transform:translate(100%,0%)}", "a{transform:translate(100%)}"],
			["a{transform:translate(0%,-100%)}", "a{transform:translateY(-100%)}"],
			["a{transform:translate(0.0%,5px)}", "a{transform:translateY(5px)}"],
			["a{transform:translate(10px,0em)}", "a{transform:translate(10px)}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["no axis is zero", "a{transform:translate(1px,2px)}"],
			["the factors differ", "a{transform:scale(2,3)}"],
			// A substitution could expand to something the shorter call rejects —
			// `translate(var(--x),0)` with `--x:1px,2px` is dropped where
			// `translate(var(--x))` applies, so reducing it revives a declaration.
			["a substitution stands there", "a{transform:translate(var(--x),0)}"],
			[
				"the 3D matrix is not the identity there",
				"a{transform:matrix3d(20,20,0,0,40,40,0,0,0,0,1,5,80,80,0,1)}"
			],
			// The engine normalizes the axis it is given: a scaled component still
			// names the axis, but a negative one turns the rotation the other way.
			["the axis is scaled", "a{transform:rotate3d(0,0,2,37deg)}"],
			["the axis is negative", "a{transform:rotate3d(0,0,-1,37deg)}"],
			["the vector names no axis", "a{transform:rotate3d(1,1,0,37deg)}"],
			["the z factor scales", "a{transform:scale3d(2,3,4)}"],
			["a substitution could fill the second", "a{transform:skewX(var(--a))}"],
			["the skew is along y", "a{transform:skewY(10deg)}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a size whose second value is the one it defaults to", () => {
		it.each([
			["a{background-size:1rem auto}", "a{background-size:1rem}"],
			["a{background-size:auto auto}", "a{background-size:auto}"],
			["a{mask-size:3px auto}", "a{mask-size:3px}"],
			// Each layer of the list drops its own.
			["a{background-size:50% auto,2px auto}", "a{background-size:50%,2px}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// Unlike a box longhand, the omitted second value is `auto` rather than
			// the first repeated, so two equal values are not one.
			["the two values are equal", "a{background-size:1rem 1rem}"],
			["the `auto` is the first", "a{background-size:auto 1rem}"],
			["there is one value", "a{background-size:cover}"],
			// Each of these stands alone, so the second value makes a declaration
			// the engine drops — one a later declaration was written to beat.
			["the first is `cover`", "a{background-size:cover auto}"],
			["the first is `contain`", "a{background-size:contain auto}"],
			["the first is a CSS-wide keyword", "a{background-size:initial auto}"],
			// With `--x:1px 2px` the `auto` makes a third value, and the declaration
			// the engine discards would become one it keeps.
			["a substitution stands there", "a{background-size:var(--x) auto}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("an alpha value written as a percentage", () => {
		it.each([
			["a{opacity:100%}", "a{opacity:1}"],
			["a{opacity:50%}", "a{opacity:.5}"],
			["a{opacity:0%}", "a{opacity:0}"],
			// The decimal point moves rather than dividing, so no digit is lost.
			["a{opacity:33.33%}", "a{opacity:.3333}"],
			["a{opacity:-50%}", "a{opacity:-.5}"],
			["a{shape-image-threshold:12.5%}", "a{shape-image-threshold:.125}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the number is no shorter", "a{opacity:5%}"],
			["a substitution stands there", "a{opacity:var(--x)}"],
			["the percentage means something else", "a{width:100%}"]
		])("keeps the percentage where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a ratio's denominator of one", () => {
		it.each([
			["a{aspect-ratio:2/1}", "a{aspect-ratio:2}"],
			["a{aspect-ratio:2 / 1}", "a{aspect-ratio:2}"],
			["a{aspect-ratio:auto 3/1}", "a{aspect-ratio:auto 3}"],
			["a{aspect-ratio:1/1}", "a{aspect-ratio:1}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the denominator is another number", "a{aspect-ratio:2/10}"],
			["a substitution stands there", "a{aspect-ratio:var(--x)/1}"],
			["the property takes no ratio", "a{width:2/1}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a linear gradient's default direction", () => {
		it.each([
			[
				"a{background:linear-gradient(to bottom,#fff,#000)}",
				"a{background:linear-gradient(#fff,#000)}"
			],
			[
				"a{background:linear-gradient(180deg,red,blue)}",
				"a{background:linear-gradient(red,blue)}"
			],
			[
				"a{background:repeating-linear-gradient(to bottom,red,blue)}",
				"a{background:repeating-linear-gradient(red,blue)}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			[
				"the direction is not the default",
				"a{background:linear-gradient(to right,#fff,#000)}"
			],
			// A prefixed gradient measures its angle the other way round.
			[
				"the gradient is prefixed",
				"a{background:-webkit-linear-gradient(180deg,red,blue)}"
			],
			[
				"there is no direction to drop",
				"a{background:linear-gradient(red,blue)}"
			]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a gradient's color stops", () => {
		it.each([
			// CSS Images 3 §3.4.3 puts the last stop at 100% when it has none.
			[
				"a{background:linear-gradient(red,blue 100%)}",
				"a{background:linear-gradient(red,blue)}"
			],
			[
				"a{background:linear-gradient(to right,red,blue 100%)}",
				"a{background:linear-gradient(to right,red,blue)}"
			],
			// Both folds run: dropping the default direction must not cost the stop.
			[
				"a{background:linear-gradient(to bottom,red,blue 100%)}",
				"a{background:linear-gradient(red,blue)}"
			],
			// A conic gradient's own turn, spelled either way.
			[
				"a{background:conic-gradient(red,blue 360deg)}",
				"a{background:conic-gradient(red,blue)}"
			],
			[
				"a{background:conic-gradient(red,blue 1turn)}",
				"a{background:conic-gradient(red,blue)}"
			],
			// CSS Images 4 §3.4: two positions on one stop are the two stops they
			// would be written as.
			[
				"a{background:linear-gradient(red 0%,red 50%,blue)}",
				"a{background:linear-gradient(red 0% 50%,blue)}"
			],
			[
				"a{background:conic-gradient(from 0deg,red 0%,red 50%)}",
				"a{background:conic-gradient(from 0deg,red 0% 50%)}"
			],
			[
				"a{background:repeating-linear-gradient(red 0,red 10px,blue 10px,blue 20px)}",
				"a{background:repeating-linear-gradient(red 0 10px,blue 10px 20px)}"
			],
			// The names match case-insensitively.
			[
				"a{background:linear-gradient(RED 0%,red 50%,blue)}",
				"a{background:linear-gradient(RED 0% 50%,blue)}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it("keeps a two-position stop the target cannot read", () => {
			expect(
				minify("a{background:linear-gradient(red 0%,red 50%,blue)}", {
					cssGradientDoublePosition: false
				})
			).toBe("a{background:linear-gradient(red 0%,red 50%,blue)}");
		});

		it.each([
			// A color hint is a position alone, so it is no stop to fold with.
			[
				"a stop sits beside a color hint",
				"a{background:linear-gradient(red 0%,30%,blue)}"
			],
			[
				"the last stop already carries two positions",
				"a{background:linear-gradient(red 50% 100%,blue)}"
			],
			[
				"the last stop has no position",
				"a{background:linear-gradient(red 0%,blue)}"
			],
			[
				"the last position is not the implied one",
				"a{background:linear-gradient(red,blue 90%)}"
			],
			// A turn is no position a linear gradient's stop list ever means.
			[
				"the position is an angle the gradient does not take",
				"a{background:linear-gradient(red,blue 360deg)}"
			],
			[
				"two adjacent stops name different colors",
				"a{background:linear-gradient(red 0%,blue 50%,green)}"
			],
			[
				"the gradient is prefixed",
				"a{background:-webkit-linear-gradient(red 0%,red 50%)}"
			],
			["the call is no gradient", "a{background:image-set(url(a.png) 100%)}"]
		])("keeps them where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("grid-template-areas", () => {
		it("keeps the cell names and drops the whitespace parting the rows", () => {
			expect(minify('a{grid-template-areas:"a  a" "b  b"}')).toBe(
				'a{grid-template-areas:"a a""b b"}'
			);
		});

		it("keeps the space two null cells need", () => {
			// `..` is one null cell; `. .` is two, so the space between them counts.
			expect(minify('a{grid-template-areas:". ." "b b"}')).toBe(
				'a{grid-template-areas:". .""b b"}'
			);
		});

		it("keeps a value that is not a row list", () => {
			expect(minify("a{grid-template-areas:none}")).toBe(
				"a{grid-template-areas:none}"
			);
		});
	});

	describe("An+B in its shortest notation", () => {
		it.each([
			[":nth-child(0n+3){color:red}", ":nth-child(3){color:red}"],
			[":nth-child(0n-3){color:red}", ":nth-child(-3){color:red}"],
			[":nth-child(-0n+3){color:red}", ":nth-child(3){color:red}"],
			[":nth-last-child(0n+2){color:red}", ":nth-last-child(2){color:red}"],
			[":nth-child(2n+1){color:red}", ":nth-child(odd){color:red}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the step is not zero", ":nth-child(2n+3){color:red}"],
			["it is already a plain B", ":nth-child(3){color:red}"],
			["an `of` clause follows it", ":nth-child(0n+3 of .a){color:red}"]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a named color the shortest spelling beats", () => {
		it.each([
			["a{color:white}", "a{color:#fff}"],
			["a{color:lightgoldenrodyellow}", "a{color:#fafad2}"],
			// Two names carry this value and neither beats the hex.
			["a{color:magenta}", "a{color:#f0f}"],
			["a{color:WHITE}", "a{color:#fff}"],
			["a{border:1px solid white}", "a{border:1px solid #fff}"],
			[
				"a{box-shadow:0 0 1px lightgoldenrodyellow}",
				"a{box-shadow:0 0 1px #fafad2}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// Already the shortest text for its value.
			["it is its own shortest spelling", "a{color:red}"],
			["a same-length hex ties it", "a{color:cyan}"],
			// An identifier here may be the author's own name.
			["the property names a keyframe", "a{animation-name:white}"],
			["the property names a grid area", "a{grid-area:white}"],
			["the property also takes an image", "a{background:white}"],
			["it is a custom property's value", "a{--x:white}"],
			[
				"it is the syntax a condition tests",
				"@supports (color:white){a{color:red}}"
			]
		])("keeps it where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("combinators inside a selector function", () => {
		it.each([
			[":where(.a > .b){color:red}", ":where(.a>.b){color:red}"],
			[":is(.a > .b, .c ~ .d){color:red}", ":is(.a>.b,.c~.d){color:red}"],
			[":not(.a + .b){color:red}", ":not(.a+.b){color:red}"],
			[":has(.a > .b){color:red}", ":has(.a>.b){color:red}"],
			[":nth-child(2n + 3){color:red}", ":nth-child(2n+3){color:red}"],
			[
				":nth-child(2n of .a > .b){color:red}",
				":nth-child(2n of .a>.b){color:red}"
			],
			// The same trim reaches a selector wherever one is applied.
			[
				"@media (min-width:1px){:where(.a > .b){color:red}}",
				"@media (width>=1px){:where(.a>.b){color:red}}"
			],
			[
				"@layer x{:where(.a > .b){color:red}}",
				"@layer x{:where(.a>.b){color:red}}"
			],
			[".x{&:where(.a > .b){color:red}}", ".x{&:where(.a>.b){color:red}}"]
		])(
			"drops the whitespace a combinator does not need: %s",
			(css, expected) => {
				expect(minify(css)).toBe(expected);
			}
		);

		it("keeps the whitespace a math expression does need", () => {
			// `+` and `-` are operators only with whitespace on both sides.
			expect(minify("a{width:calc(1em + 2px)}")).toBe(
				"a{width:calc(1em + 2px)}"
			);
		});

		it("drops an argument list that is only whitespace", () => {
			// The one argument a function carries is a whitespace token, which
			// separates nothing — so the parentheses close on nothing at all.
			expect(minify("a{width:calc( )}")).toBe("a{width:calc()}");
			expect(minify("a:not( ){top:0}")).toBe("a:not(){top:0}");
		});

		it("keeps a `@supports` condition as written", () => {
			// The condition is the syntax being tested, and an engine hands it back
			// verbatim — `selector(.a>.b)` builds a different CSSOM from `.a > .b`.
			expect(minify("@supports selector(.a > .b){c{color:red}}")).toBe(
				"@supports selector(.a > .b){c{color:red}}"
			);
			expect(minify("@supports selector(:is(.a > .b)){c{color:red}}")).toBe(
				"@supports selector(:is(.a > .b)){c{color:red}}"
			);
		});

		it("leaves a value function of the same name alone", () => {
			// `element()` takes an id selector, but in a value there is no combinator
			// to trim and the argument is a reference.
			expect(minify("a{background:element(#a)}")).toBe(
				"a{background:element(#a)}"
			);
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
			).toBe("a{column-rule:medium groove #639}");
			expect(
				minify(
					"a{text-decoration-line:none;text-decoration-style:solid;text-decoration-color:#123;text-decoration-thickness:10%}"
				)
			).toBe("a{text-decoration:none solid #123 10%}");
			expect(minify("a{flex-direction:column;flex-wrap:wrap}")).toBe(
				"a{flex-flow:column wrap}"
			);
			// A grammar naming its slots by type rather than by property.
			expect(
				minify(
					"a{border-top-width:1px;border-top-style:solid;border-top-color:red}"
				)
			).toBe("a{border-top:1px solid red}");
			expect(
				minify(
					"a{border-bottom-style:solid;border-bottom-width:1px;border-bottom-color:red}"
				)
			).toBe("a{border-bottom:1px solid red}");
			// `border` itself resets `border-image`, which its three longhands leave
			// alone, so the four-sided family is no family of this merge.
			const sided = "a{border-width:1px;border-style:solid;border-color:red}";
			expect(minify(sided)).toBe(sided);
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
			).toBe("a{column-rule:medium groove #639;color:red}");
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
			// A `translate3d` this shape reduces no further, so only the unit moves.
			expect(minify("a{transform:translate3d(0px, 1em, 2em)}")).toBe(
				"a{transform:translate3d(0,1em,2em)}"
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
			["calc(1e20px + 1px)"],
			["calc(1e308px*1e10)"],
			// Past the range the rounding covers, so every digit is kept — and all
			// of them together are longer than the expression.
			["calc(123456px/1.1)"],
			// A math function whose meaning is not written yet, so the sum inside it
			// folds but the call does not.
			["sqrt(4px)"]
		])("leaves %s alone", (expression) => {
			expect(value(expression)).toBe(expression);
		});

		it.each([
			// The fold prints a double back, so its result is rounded the way an
			// authored number is — six significant digits.
			["calc(3px/1.1)", "2.72727px"],
			["calc(100%/3)", "33.3333%"],
			["calc(1/3*1px)", ".333333px"],
			["calc((6/10 - .375)*1em)", ".225em"],
			["calc((6/14 - .375)*1em)", ".0535714em"],
			// An angle keeps every digit: `rotate()` runs it through trig.
			["calc(1turn/3)", "calc(1turn/3)"],
			// Above the range the rounding covers the digits carry, so they stay.
			["calc(1e4px + 1px)", "10001px"]
		])("%s folds to %s", (expression, expected) => {
			expect(value(expression)).toBe(expected);
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
			.process(`a{width:${value}}`, { mode: "minify", convertLengthUnits })
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
				.process(`a{transition-duration:${value}}`, { mode: "minify" })
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
			mode: "minify",
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

	it("drops another engine's prefix a chrome-only target never reads", () => {
		expect(
			minify("a{-moz-user-select:none;user-select:none}", ["chrome 120"])
		).toBe("a{user-select:none}");
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

	it("prefixes a shorthand the box merge wrote onto a longhand's node", () => {
		expect(
			minify(
				"a{border-top-left-radius:5px;border-top-right-radius:5px;border-bottom-right-radius:5px;border-bottom-left-radius:5px}",
				["firefox 3.6"]
			)
		).toBe("a{-moz-border-radius:5px;border-radius:5px}");
	});

	it("treats Safari Technology Preview as newest but still finitely versioned", () => {
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

describe("CssSyntax minify — vendor prefixes (values)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			environment: browsers ? { browsers } : undefined
		}).code;

	it("adds the spellings a target needs for a keyword value", () => {
		expect(minify("a{width:max-content}", ["chrome 40", "firefox 40"])).toBe(
			"a{width:-webkit-max-content;width:-moz-max-content;width:max-content}"
		);
	});

	it("spells a value an engine renamed rather than prefixed", () => {
		expect(minify("a{display:flex}", ["ie 10"])).toBe(
			"a{display:-ms-flexbox;display:flex}"
		);
	});

	it("carries `!important` onto the copy", () => {
		expect(minify("a{position:sticky!important}", ["safari 9"])).toBe(
			"a{position:-webkit-sticky!important;position:sticky!important}"
		);
	});

	it("drops a value spelling no target needs", () => {
		expect(minify("a{display:-ms-flexbox;display:flex}", ["chrome 130"])).toBe(
			"a{display:flex}"
		);
	});

	it("keeps one a target still needs", () => {
		expect(minify("a{display:-ms-flexbox;display:flex}", ["ie 10"])).toBe(
			"a{display:-ms-flexbox;display:flex}"
		);
	});

	it("keeps a lone value spelling — nothing else writes the property", () => {
		expect(minify("a{display:-ms-flexbox}", ["chrome 130"])).toBe(
			"a{display:-ms-flexbox}"
		);
	});

	it("does not double a spelling the source already carries", () => {
		expect(
			minify("a{width:-webkit-max-content;width:max-content}", ["chrome 40"])
		).toBe("a{width:-webkit-max-content;width:max-content}");
	});

	it("leaves a value that is not the keyword alone", () => {
		expect(minify("a{width:calc(1px + 1em)}", ["chrome 40"])).toBe(
			"a{width:calc(1px + 1em)}"
		);
	});

	it("leaves a keyword of a property no engine spelled its own way", () => {
		expect(minify("a{float:left}", ["chrome 40"])).toBe("a{float:left}");
	});

	it("does nothing without a target list", () => {
		expect(minify("a{width:max-content}")).toBe("a{width:max-content}");
	});
});

describe("CssSyntax minify — vendor prefixes (spellings an engine dropped)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			environment: { browsers }
		}).code;

	it("stops at the version the engine dropped the spelling, not at the unprefixed one", () => {
		// `-moz-outline` went in Firefox 3.6; the property it stood for is filed as
		// complete only from 88, which is not where the spelling stopped working.
		expect(minify("a{outline:none}", ["firefox 40"])).toBe("a{outline:none}");
		expect(minify("a{outline:none}", ["firefox 3"])).toBe(
			"a{-moz-outline:none;outline:none}"
		);
	});

	it("drops a prefix an engine switch took away", () => {
		// Presto read `-o-transform`; the Blink Opera that followed at 15 never did.
		expect(minify("a{transform:none}", ["opera 20"])).toBe(
			"a{-webkit-transform:none;transform:none}"
		);
		expect(minify("a{transform:none}", ["opera 12.1"])).toBe(
			"a{-o-transform:none;transform:none}"
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
			mode: "minify",
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

	it("prefixes a nested at-rule against its own scope", () => {
		expect(
			minify("@media screen{@keyframes s{to{opacity:1}}}", ["chrome 40"])
		).toBe(
			"@media screen{@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}}"
		);
	});

	it("does not suppress a scoped copy from a top-level prefixed rule", () => {
		expect(
			minify(
				"@-webkit-keyframes s{to{opacity:1}}@media screen{@keyframes s{to{opacity:.3}}}",
				["chrome 40"]
			)
		).toBe(
			"@-webkit-keyframes s{to{opacity:1}}@media screen{@-webkit-keyframes s{to{opacity:.3}}@keyframes s{to{opacity:.3}}}"
		);
	});

	it("pairs a nested prefixed rule with the twin in its own scope", () => {
		expect(
			minify(
				"@media screen{@keyframes s{to{opacity:1}}@-webkit-keyframes s{to{opacity:1}}}",
				["chrome 130"]
			)
		).toBe("@media screen{@keyframes s{to{opacity:1}}}");
	});

	it("keeps a nested prefixed rule its twin follows — only a top-level rule is still a piece of its own", () => {
		expect(
			minify(
				"@media screen{@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}}",
				["chrome 130"]
			)
		).toBe(
			"@media screen{@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}}"
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
			mode: "minify",
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

	it("copies only the selectors of a list that carry the pseudo", () => {
		expect(minify(".a::placeholder,.b{color:red}", ["chrome 40"])).toBe(
			".a::-webkit-input-placeholder{color:red}.a::placeholder,.b{color:red}"
		);
	});

	it("keeps a copy's own list together, one spelling at a time", () => {
		expect(
			minify("input::placeholder,textarea::placeholder{color:red}", [
				"chrome 40",
				"firefox 40"
			])
		).toBe(
			"input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:red}input::-moz-placeholder,textarea::-moz-placeholder{color:red}input::placeholder,textarea::placeholder{color:red}"
		);
	});

	it("drops a prefixed list its unprefixed twin follows", () => {
		expect(
			minify(
				"input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:red}input::placeholder,textarea::placeholder{color:red}",
				["chrome 130"]
			)
		).toBe("input::placeholder,textarea::placeholder{color:red}");
	});

	it("leaves a list mixing two engines' spellings alone", () => {
		expect(
			minify(
				"input::-webkit-input-placeholder,textarea::-moz-placeholder{color:red}",
				["chrome 130"]
			)
		).toBe(
			"input::-webkit-input-placeholder,textarea::-moz-placeholder{color:red}"
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

	it("prefixes a functional pseudo, carrying its argument", () => {
		expect(minify(":dir(rtl){color:red}", ["firefox 40"])).toBe(
			":-moz-dir(rtl){color:red}:dir(rtl){color:red}"
		);
	});

	it("keeps two functional pseudos with different arguments distinct", () => {
		expect(
			minify(":dir(rtl){color:red}:dir(ltr){color:blue}", ["firefox 40"])
		).toBe(
			":-moz-dir(rtl){color:red}:dir(rtl){color:red}:-moz-dir(ltr){color:blue}:dir(ltr){color:blue}"
		);
	});

	it("leaves a pseudo inside a functional selector untouched", () => {
		expect(minify(":not(:autofill){color:red}", ["chrome 40"])).toBe(
			":not(:autofill){color:red}"
		);
	});

	it("spells a pseudo its engines renamed rather than prefixed", () => {
		expect(minify(":is(a,b) c{color:red}", ["chrome 40", "firefox 40"])).toBe(
			":-webkit-any(a,b) c{color:red}:-moz-any(a,b) c{color:red}:is(a,b) c{color:red}"
		);
	});

	it("drops a renamed pseudo no target needs", () => {
		expect(
			minify(":-webkit-any(a,b){color:red}:is(a,b){color:red}", ["chrome 130"])
		).toBe(":is(a,b){color:red}");
	});

	it("spells `:fullscreen` for each engine that renamed it", () => {
		expect(minify(":fullscreen{color:red}", ["chrome 40", "firefox 40"])).toBe(
			":-webkit-full-screen{color:red}:-moz-full-screen{color:red}:fullscreen{color:red}"
		);
	});

	it("prefixes a nested rule against its own scope", () => {
		expect(
			minify("@media screen{::placeholder{color:red}}", ["chrome 40"])
		).toBe(
			"@media screen{::-webkit-input-placeholder{color:red}::placeholder{color:red}}"
		);
	});

	it("prefixes a rule nested under another", () => {
		expect(minify("a{&::placeholder{color:red}}", ["chrome 40"])).toBe(
			"a{&::-webkit-input-placeholder{color:red}&::placeholder{color:red}}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minify("::placeholder{color:red}")).toBe("::placeholder{color:red}");
	});
});

describe("CssSyntax minify — vendor prefixes (target selection)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			environment: browsers ? { browsers } : undefined
		}).code;

	it("reads IE Mobile through IE's windows — the same engine on the same version line", () => {
		expect(
			minify("a{-ms-user-select:none;user-select:none}", [
				"chrome 130",
				"ie_mob 11"
			])
		).toBe("a{-ms-user-select:none;user-select:none}");
	});

	it("skips a browser no dataset covers, as lightningcss's target mapping does", () => {
		expect(
			minify("a{-webkit-border-radius:5px;border-radius:5px}", [
				"chrome 130",
				"bb 10"
			])
		).toBe("a{border-radius:5px}");
	});

	it("still adds for the browsers it does resolve", () => {
		expect(minify("a{user-select:none}", ["chrome 40", "op_mini all"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("leaves prefixes alone when nothing in the selection resolves", () => {
		expect(
			minify("a{-webkit-border-radius:5px;border-radius:5px}", [
				"op_mini all",
				"chrome"
			])
		).toBe("a{-webkit-border-radius:5px;border-radius:5px}");
	});

	it("leaves prefixes alone for an empty selection", () => {
		expect(minify("a{-webkit-border-radius:5px;border-radius:5px}", [])).toBe(
			"a{-webkit-border-radius:5px;border-radius:5px}"
		);
	});

	it("reads every selected version of one browser, not just the oldest", () => {
		// Chrome 130 is past `user-select`'s unprefixed arrival and 40 is inside its
		// prefix window: an interval is not answered by the selection's low end.
		expect(minify("a{user-select:none}", ["chrome 130", "chrome 40"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("takes the low end of a version range", () => {
		expect(minify("a{user-select:none}", ["ios_saf 15.0-15.1"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (joined rules)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			environment: browsers ? { browsers } : undefined
		}).code;

	it("keeps the prefixes it added when two at-rules join", () => {
		expect(
			minify("@media screen{user-select:none}@media screen{color:red}", [
				"chrome 40"
			])
		).toBe(
			"@media screen{-webkit-user-select:none;user-select:none;color:red}"
		);
	});

	it("does not bring back a prefix it dropped when two at-rules join", () => {
		expect(
			minify(
				"@media screen{-webkit-border-radius:5px;border-radius:5px}@media screen{color:red}",
				["chrome 130"]
			)
		).toBe("@media screen{border-radius:5px;color:red}");
	});

	it("joins the rules inside two blocks with their own prefixes", () => {
		expect(
			minify("@media screen{a{user-select:none}}@media screen{b{color:red}}", [
				"chrome 40"
			])
		).toBe(
			"@media screen{a{-webkit-user-select:none;user-select:none}b{color:red}}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (a twin written first)", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]=} browsers the browserslist selection
	 * @returns {string} its minified serialization
	 */
	const minify = (css, browsers) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			environment: browsers ? { browsers } : undefined
		}).code;

	it("drops a prefixed at-rule its unprefixed twin follows", () => {
		expect(
			minify("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}", [
				"chrome 130"
			])
		).toBe("@keyframes s{to{opacity:1}}");
	});

	it("drops a prefixed rule its unprefixed twin follows", () => {
		expect(
			minify("::-webkit-input-placeholder{color:red}::placeholder{color:red}", [
				"chrome 130"
			])
		).toBe("::placeholder{color:red}");
	});

	it("keeps it where a target still needs the prefix", () => {
		expect(
			minify("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}", [
				"chrome 40"
			])
		).toBe("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}");
	});

	it("keeps a prefixed at-rule with no unprefixed twin at all", () => {
		expect(minify("@-webkit-keyframes s{to{opacity:1}}", ["chrome 130"])).toBe(
			"@-webkit-keyframes s{to{opacity:1}}"
		);
	});

	it("drops one its twin follows from further off", () => {
		expect(
			minify(
				"@-webkit-keyframes s{to{opacity:1}}a{color:red}@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("a{color:red}@keyframes s{to{opacity:1}}");
	});

	it("drops each of a run of prefixed at-rules its twins follow", () => {
		expect(
			minify(
				"@-webkit-keyframes a{to{opacity:1}}@-webkit-keyframes b{to{opacity:0}}@keyframes a{to{opacity:1}}@keyframes b{to{opacity:0}}",
				["chrome 130"]
			)
		).toBe("@keyframes a{to{opacity:1}}@keyframes b{to{opacity:0}}");
	});

	it("keeps a kept comment that stood between them", () => {
		expect(
			minify(
				"@-webkit-keyframes s{to{opacity:1}}/*! banner */@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("/*! banner */@keyframes s{to{opacity:1}}");
	});

	it("leaves a joined run alone", () => {
		expect(
			minify(
				"@media screen{a{color:red}}@media screen{b{color:red}}@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("@media screen{a,b{color:red}}@keyframes s{to{opacity:1}}");
	});
});
