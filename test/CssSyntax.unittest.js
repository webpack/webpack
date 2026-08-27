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

/**
 * @param {string} css a stylesheet
 * @param {string[]=} browsers the browserslist selection to target
 * @param {import("../lib/css/syntax").CssEnvironment=} abilities the CSS abilities the target reads
 * @returns {string} its minified serialization
 */
const minifyFor = (css, browsers, abilities) =>
	new SourceProcessor().process(css, {
		mode: "minify",
		environment: browsers ? { ...abilities, browsers } : abilities
	}).code;

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

	it("parseADeclaration reads a lone {}-block as a whole value", () => {
		// §5.4.6 step 8 rejects a `{}` block only when the value holds another
		// non-whitespace token beside it — a block standing alone is the value.
		// Measured in headless Chromium: `.a{color:{a:b}}` is a declaration the
		// grammar then throws out, not a nested rule (`cssRules` stays empty),
		// while `.a{a:hover{color:red}}` is one.
		const decl = parseADeclaration("color: { a: b }");
		expect(decl).toBeDefined();
		expect(
			/** @type {import("../lib/css/syntax").Declaration} */ (decl).name
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
				(d) => /** @type {import("../lib/css/syntax").Declaration} */ (d).name
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
	// Distinct blocks: rules printing the same one join into a selector list, and
	// what these cases are about is the streaming, not the joining.
	const rule = (i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`;
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

	it("cuts a dead rule where it stands after an earlier cut in the piece", () => {
		// Sibling `@layer a` blocks fold into one piece, so a batch cuts twice in
		// it — and its own second span must name where the first cut left it.
		const dead = ".p{color:red}.q{color:blue}";
		const victim =
			".victim{align-items:flex-start;border-radius:0;opacity:1;background:red}";
		const src = `@layer outer{${repeat(
			6000,
			(i) => `.f${i}{color:red}`
		)}@layer a{${dead}}@layer a{${dead}}@layer a{${victim}}@layer a{.q{color:blue}}}`;
		// The outer block has to stream for the fold to be the one under test.
		expect(childCount(src)).toBe(0);
		const out = minify(src);
		// Sliced, so a wrong cut reads as the mangled rule and not as the sheet.
		const at = out.indexOf(".victim");
		expect(out.slice(at, at + victim.length)).toBe(victim);
	});

	it("enters a streamed rule before its children and exits after them", () => {
		const seq = walk(`@media screen{${SMALL}}`, { recurseBlocks: true });
		expect(seq[0]).toBe("+AtRule|0|0");
		expect(seq[seq.length - 1]).toBe("-AtRule|0|0");
		const streamed = walk(`@media screen{${BIG}}`);
		expect(streamed[0]).toBe("+AtRule|0|0");
		expect(streamed[streamed.length - 1]).toBe("-AtRule|0|0");
	});

	it("keeps a descriptor opaque in a streamed body", () => {
		// The block outlives the call that entered its rule, so `@property` /
		// `@function` state is restored per frame rather than around one walk.
		const value = "rgb(255,0,0)0.50px";
		expect(minify(`@function --f(){${BIG}result:${value}}`)).toContain(
			`result:${value}`
		);
		expect(
			minify(
				`@property --x{syntax:"*";inherits:false;${BIG}initial-value:${value}}`
			)
		).toContain(`initial-value:${value}`);
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
		// A block of its own per rule, so the sibling join has nothing to gather
		// here and what is pinned is the prelude, not the merge.
		const nested = repeat(3000, (i) => `& .x${i}{top:${i + 1}px}`);
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
		const middle = repeat(3000, (i) => `& .m${i}{top:${i + 1}px}`);
		const src = `.root{color:red;${middle}color:red;}`;
		expect(childCount(src, NodeType.QualifiedRule)).toBe(0);
		expect(minify(src)).toBe(`.root{${middle}color:red}`);
	});

	it("takes back only its own output when it drops the last `;`", () => {
		// The `;` a `}` makes redundant is dropped by walking back over the pieces
		// the block emitted, past the empty one a later duplicate took back. What
		// stands before the block keeps its own separator.
		const mid = repeat(3000, (i) => `& .m${i}{top:${i + 1}px}`);
		const src = `.root{lead:1;${mid}dup:2;dup:2;}`;
		expect(childCount(src, NodeType.QualifiedRule)).toBe(0);
		expect(minify(src)).toBe(`.root{lead:1;${mid}dup:2}`);
	});

	it("writes a streamed block's children straight through when beautifying", () => {
		// A streamed block emits each child as it finishes rather than collecting
		// them, so the order it writes them in is the order they were parsed.
		const out = new SourceProcessor().process(
			`@media all{${BIG}.z1{left:0}.z2{left:0}}`,
			{ mode: "beautify" }
		).code;
		expect(out).toContain(".z1 {\nleft: 0;\n}\n.z2 {\nleft: 0;\n}");
	});

	it("declines to stream a block a longhand family could still merge in", () => {
		// The merge needs every declaration at once, so a block holding no child
		// rule is never streamed however far past the threshold it grows.
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

	it.each([
		// An `@import` is not a rule a join may hold back, so it is written straight
		// through — with whatever comment stood before it still ahead of it.
		['/*! a */@import "x.css";a{top:0}', '/*! a */@import "x.css";a{top:0}'],
		// ...including where a rule held back for a join goes out first.
		[
			'a{color:red}b{color:red}/*! c */@import "x.css";',
			'a,b{color:red}/*! c */@import "x.css";'
		],
		['/*! h */@charset "utf-8";a{top:0}', '/*! h */@charset "utf-8";a{top:0}']
	])(
		"writes a kept comment ahead of the rule it stood before: %s",
		(src, out) => {
			expect(min(src)).toBe(out);
		}
	);

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

	it("keeps a custom property's tokens as the source wrote them", () => {
		// No token is rewritten; a dropped comment leaves the boundary it stood
		// for, a space only where the tokens it parts would fuse.
		expect(min("a{--x:1px/*c*/2px}")).toBe("a{--x:1px 2px}");
		expect(min("a{--x:1px 1px/*c*/1px 1px}")).toBe("a{--x:1px 1px 1px 1px}");
		expect(min("a{--x:1px /*c*/ 2px}")).toBe("a{--x:1px 2px}");
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

	it("rewrites a custom property's tokens when the option asks", () => {
		/**
		 * @param {string} css a stylesheet
		 * @returns {string} its minified serialization, custom properties rewritten
		 */
		const rewritten = (css) =>
			new SourceProcessor().process(css, {
				mode: "minify",
				rewriteCustomProperties: true
			}).code;

		// Each transform the other minifiers apply inside a `--*` value.
		expect(rewritten("a{--x:#ffffff}")).toBe("a{--x:#fff}");
		expect(rewritten("a{--x:#ffffff00}")).toBe("a{--x:#fff0}");
		expect(rewritten("a{--x:0.5rem}")).toBe("a{--x:.5rem}");
		expect(rewritten("a{--x:rgba(0,0,0,0.15)}")).toBe("a{--x:#00000026}");
		// At every layer of a list, and at depth inside a function.
		expect(rewritten("a{--x:0px 0px 0px 2px #ffffffcc}")).toBe(
			"a{--x:0px 0px 0px 2px #fffc}"
		);
		expect(rewritten("a{--x:max(1px,0.0625rem)}")).toBe(
			"a{--x:max(1px,.0625rem)}"
		);
		// A substitution's fallback is the property's value, so its colors shorten
		// as any other value's do — but a hash a worklet or an unknown function
		// reads is not known to be one.
		expect(rewritten("a{--x:var(--y,#ffffff)}")).toBe("a{--x:var(--y,#fff)}");
		expect(rewritten("a{--x:paint(w,#ffffff)}")).toBe(
			"a{--x:paint(w,#ffffff)}"
		);
		expect(rewritten("a{--x:some-fn(#ffffff)}")).toBe(
			"a{--x:some-fn(#ffffff)}"
		);
		// The empty value a `var()` fallback reads is still not a dropped one.
		expect(rewritten("a{--x:}")).toBe("a{--x:}");
		// The boundaries the option does not touch still print as they did.
		expect(rewritten("a{--x:1px/*c*/2px}")).toBe("a{--x:1px 2px}");
		expect(rewritten("a{--x:1px/*!k*/2px}")).toBe("a{--x:1px/*!k*/2px}");
		// Off, every one of them is written back as authored.
		expect(min("a{--x:#ffffff}")).toBe("a{--x:#ffffff}");
		expect(min("a{--x:rgba(0,0,0,0.15)}")).toBe("a{--x:rgba(0,0,0,0.15)}");
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
		// Whitespace and a dropped comment are one boundary, not three.
		expect(min("a{--x:foo( /*c*/ a )}")).toBe("a{--x:foo(a)}");
		// A kept one is placed where it stood, at depth too.
		expect(min("a{--x:foo(a/*!k*/b)}")).toBe("a{--x:foo(a/*!k*/b)}");
		// A function closed at EOF has no `)` to write back.
		expect(min("a{--x:foo(a/*c*/b")).toBe("a{--x:foo(a b}");
	});

	it("minifies the whitespace between a custom property's tokens", () => {
		// Whitespace between two tokens says only that they are two, so a run of it
		// is the one space they need and a substitution reads the same stream.
		expect(min("a{--x:1px    2px}")).toBe("a{--x:1px 2px}");
		expect(min("a{--x:1px\n\t2px}")).toBe("a{--x:1px 2px}");
		// Nothing fuses with a comma, so the boundaries either side of one go.
		expect(min("a{--x:1px , 2px ,3px}")).toBe("a{--x:1px,2px,3px}");
		expect(min("a{--x: , a}")).toBe("a{--x:,a}");
		expect(min("a{--x:a , }")).toBe("a{--x:a,}");
		// Nor with a block's delimiters, on either side of one.
		expect(min("a{--x:a [b] c}")).toBe("a{--x:a[b]c}");
		expect(min("a{--x:a {b} c}")).toBe("a{--x:a{b}c}");
		expect(min("a{--x:(a) b}")).toBe("a{--x:(a)b}");
		expect(min("a{--x:url(a) b}")).toBe("a{--x:url(a)b}");
		// `(` is the exception: an ident in front of it makes a function token.
		expect(min("a{--x:a (b)}")).toBe("a{--x:a (b)}");
		expect(min("a{--x:a/*c*/(b)}")).toBe("a{--x:a (b)}");
		// Nor with a block's delimiters, at any depth and in a block of every shape.
		expect(min("a{--x:foo( 1 ,  2 )}")).toBe("a{--x:foo(1,2)}");
		expect(min("a{--x:[ a  b ]}")).toBe("a{--x:[a b]}");
		expect(min("a{--x:{ a:1 }}")).toBe("a{--x:{a:1}}");
		expect(min("a{--x:( a ( b ) )}")).toBe("a{--x:(a (b))}");
		// A string or a url is one token, written back whole.
		expect(min('a{--x:"a  b"  c}')).toBe('a{--x:"a  b" c}');
		expect(min("a{--x:url( a  b )}")).toBe("a{--x:url( a  b )}");
		// `calc()`'s `+` is an operator only with whitespace either side, and a
		// collapsed run is still whitespace.
		expect(min("a{--x:calc( 1px  +  2px )}")).toBe("a{--x:calc(1px + 2px)}");
		// A kept comment takes the boundary it stood in with it.
		expect(min("a{--x:1px  /*!k*/  2px}")).toBe("a{--x:1px /*!k*/ 2px}");
		expect(min("a{--x:foo(  /*!k*/  a)}")).toBe("a{--x:foo(/*!k*/ a)}");
		// The last boundary parts the value from a `)` it cannot fuse with, so only
		// a kept comment in it is left to print.
		expect(min("a{--x:foo(a  /*!k*/)}")).toBe("a{--x:foo(a /*!k*/)}");
		expect(min("a{--x:foo(a/*!k*/)}")).toBe("a{--x:foo(a/*!k*/)}");
		expect(min("a{--x:foo(a  /*c*/)}")).toBe("a{--x:foo(a)}");
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
			["a{b:1 //**/*}", "a{b:1/ *}"],
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

	it("drops a value separator its tokens do not need", () => {
		// Whitespace in a value only separates tokens, so each of these reads back
		// as the same token stream without it.
		expect(min("a{padding:.35em .75em}")).toBe("a{padding:.35em.75em}");
		expect(min("a{transform:translate(1px) scale(2)}")).toBe(
			"a{transform:translate(1px)scale(2)}"
		);
		expect(min("a{background:url(a.png) no-repeat}")).toBe(
			"a{background:url(a.png)no-repeat}"
		);
		expect(min('a{grid-template-areas:"a b" "c d"}')).toBe(
			'a{grid-template-areas:"a b""c d"}'
		);
		expect(min("a{border:1px solid #fff}")).toBe("a{border:1px solid#fff}");
	});

	it("keeps a value separator wherever it carries something", () => {
		// A number takes a `%` on, making `123 %` the one percentage `123%`.
		expect(min("a{b:123 %}")).toBe("a{b:123 %}");
		// An ident ending in a digit takes no `%`, so that one still tightens.
		expect(min("a{b:x1 %}")).toBe("a{b:x1%}");
		expect(min("a{b:50% 25%}")).toBe("a{b:50%25%}");
		// A bare number would take the `.` on, making `0 .5em` the one value `0.5em`.
		expect(min("a{margin:0 .5em}")).toBe("a{margin:0 .5em}");
		// Two idents would fuse into one.
		expect(min("a{font-family:My Font,serif}")).toBe(
			"a{font-family:My Font,serif}"
		);
		// CSS Values 4 §10.1 needs the whitespace around a math `-`.
		expect(min("a{width:calc(2rem - .02px)}")).toBe(
			"a{width:calc(2rem - .02px)}"
		);
		// A custom property and a substituted value are handed back as written.
		expect(min("a{--x:.5em .5em}")).toBe("a{--x:.5em .5em}");
		expect(min("a{margin:var(--y) .5em}")).toBe("a{margin:var(--y) .5em}");
		// In a selector the separator is a descendant combinator, not a separator.
		expect(min(".a .b{c:1}")).toBe(".a .b{c:1}");
		expect(min(".a:not(.b .c){d:1}")).toBe(".a:not(.b .c){d:1}");
		// A value the string transforms read stays space-separated for them.
		expect(min("a{background-size:50% auto,2px auto}")).toBe(
			"a{background-size:50%,2px}"
		);
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

	it("keeps an empty rule a `@namespace` after it is made inert by", () => {
		// CSS Namespaces 3 §3.1: a rule the engine keeps ends the run a
		// `@namespace` may stand in. Dropping that rule would carry the dead
		// `@namespace` back to the head, where the engine honours it.
		expect(min('@supports (color:red){}@namespace y "u";a{color:red}')).toBe(
			'@supports (color:red){}@namespace y "u";a{color:red}'
		);
		expect(min('.x{}@namespace y "u";a{color:red}')).toBe(
			'.x{}@namespace y "u";a{color:red}'
		);
		// An unknown at-rule is thrown away, so it is not what ended the run — the
		// `@supports` after it is, and it has to stay for that reason too.
		expect(
			min('@totally-unknown;@supports (color:red){}@namespace y "u";a{b:1}')
		).toBe('@totally-unknown;@supports (color:red){}@namespace y "u";a{b:1}');
		// Past the first rule every engine keeps, an empty one drops as before.
		expect(min("a{color:red}.b{}@media all{}")).toBe("a{color:red}");
	});

	it("writes the replacement character an escape at EOF names", () => {
		// §4.3.7: an escape the input ran out of is U+FFFD. Written back as the
		// `\\` it was, it would escape the `}` the printer closes the rule with —
		// so the value would read as `foo}` rather than `foo\uFFFD`.
		expect(min("a{--x:foo\\")).toBe("a{--x:foo\uFFFD}");
		expect(min("a{color:foo\\")).toBe("a{color:foo\uFFFD}");
		expect(min("@media a\\")).toBe("@media a\uFFFD;");
		// §4.3.5 instead inside a string, where it names nothing at all.
		expect(min('a{content:"x\\')).toBe('a{content:"x"}');
		// The input ran out inside the string, so the engine closed it there: the
		// `}` written after it is the end of the rule, not more of the string.
		expect(min('a{--x:"foo\\')).toBe('a{--x:"foo"}');
		expect(min("a{--x:'foo\\")).toBe("a{--x:'foo'}");
		// A url token the input ran out of mid-escape holds a value its text no
		// longer spells, and the engine writes that value back closed — so the `}`
		// after it is not read as part of the url.
		expect(min("a{--x:url(foo\\")).toBe("a{--x:url(foo\uFFFD)}");
		// A `\\` with a character after it is an escape like any other, and an
		// even run is a pair of escaped backslashes.
		expect(min("a{--x:foo\\\\")).toBe("a{--x:foo\\\\}");
		expect(min("a{--x:foo\\}")).toBe("a{--x:foo\\}}");
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

	/**
	 * @param {string} value a `transform` value
	 * @returns {string} the minified value
	 */
	const transform = (value) =>
		min(`a{transform:${value}}`).slice("a{transform:".length, -1);

	// One input per entry in the reduction table, so a binding that stops firing
	// fails here rather than quietly declining to shorten anything.
	it("reduces each transform function that names a shorter one", () => {
		expect(transform("translate(5px,0)")).toBe("translate(5px)");
		expect(transform("translate(0,5px)")).toBe("translateY(5px)");
		expect(transform("translate3d(0,0,4px)")).toBe("translateZ(4px)");
		expect(transform("translate3d(1px,2px,0)")).toBe("translate(1px,2px)");
		expect(transform("scale(2,2)")).toBe("scale(2)");
		expect(transform("scale(2,1)")).toBe("scaleX(2)");
		expect(transform("scale(1,2)")).toBe("scaleY(2)");
		expect(transform("scale3d(2,3,1)")).toBe("scale(2,3)");
		expect(transform("scale3d(1,1,4)")).toBe("scaleZ(4)");
		expect(transform("rotateZ(45deg)")).toBe("rotate(45deg)");
		expect(transform("rotate3d(1,0,0,45deg)")).toBe("rotateX(45deg)");
		expect(transform("rotate3d(0,1,0,45deg)")).toBe("rotateY(45deg)");
		expect(transform("rotate3d(0,0,1,45deg)")).toBe("rotate(45deg)");
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,4,5,0,1)")).toBe(
			"matrix(1,0,0,1,4,5)"
		);
	});

	// One reduction uncovers the next, which is the loop's whole reason to exist.
	it("keeps reducing while each result names a shorter one still", () => {
		expect(transform("scale3d(1,1,1)")).toBe("scale(1)");
		expect(transform("translate3d(0,0,0)")).toBe("translateZ(0)");
	});

	// A `translate3d()`'s z is a `<length>`, so a percentage makes the whole
	// declaration invalid — shortening it away would revive what the engine drops.
	it("keeps a translate3d whose z offset is a percentage", () => {
		expect(transform("translate3d(1px,2px,0%)")).toBe(
			"translate3d(1px,2px,0%)"
		);
	});

	it("keeps a call the reduction does not name a shorter one for", () => {
		// The axis a 3D matrix would have to leave at the identity is not.
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,2,0,4,5,0,1)")).toBe(
			"matrix3d(1,0,0,0,0,1,0,0,0,0,2,0,4,5,0,1)"
		);
		expect(transform("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,4,5,0,2)")).toBe(
			"matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,4,5,0,2)"
		);
		// A component count no reduction is stated for.
		expect(transform("translate(1px,2px,3px)")).toBe("translate(1px,2px,3px)");
		expect(transform("translate3d(0,0)")).toBe("translate3d(0,0)");
		expect(transform("scale3d(1,2)")).toBe("scale3d(1,2)");
		expect(transform("rotateZ(1deg,2deg)")).toBe("rotateZ(1deg,2deg)");
		expect(transform("rotate3d(0,0,1)")).toBe("rotate3d(0,0,1)");
		expect(transform("matrix3d(1,0,0,1)")).toBe("matrix3d(1,0,0,1)");
		// An axis none of the three spellings names.
		expect(transform("rotate3d(1,1,0,45deg)")).toBe("rotate3d(1,1,0,45deg)");
		// A function outside the table keeps whatever it was written as.
		expect(transform("var(--t)")).toBe("var(--t)");
		// An empty component is malformed, and a reduction would spell it away.
		expect(transform("translate(,)")).toBe("translate(,)");
	});

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

	describe("a name CSS matches ASCII case-insensitively", () => {
		it.each([
			["a property", "a{COLOR:red}", "a{color:red}"],
			[
				"a vendor property",
				"a{-WEBKIT-Box-Shadow:0 0}",
				"a{-webkit-box-shadow:0 0}"
			],
			["an at-rule", "@MEDIA print{a{b:c}}", "@media print{a{b:c}}"],
			["a function", "a{width:CALC(1px + 2em)}", "a{width:calc(1px + 2em)}"],
			["a url token", "a{background:URL(A.PNG)}", "a{background:url(A.PNG)}"],
			[
				"a padded url token",
				"a{background:URL(  A.PNG  )}",
				"a{background:url(A.PNG)}"
			],
			["a unit", "a{width:10PX}", "a{width:10px}"],
			["a pseudo-class", "A:HOVER{b:c}", "A:hover{b:c}"],
			["a pseudo-element", "a::BEFORE{b:c}", "a:before{b:c}"],
			[
				"a pseudo inside a selector function",
				"a:NOT(b:HOVER){c:d}",
				"a:not(b:hover){c:d}"
			],
			[
				"a media feature",
				"@media (MIN-WIDTH:100PX){a{b:c}}",
				"@media (width>=100px){a{b:c}}"
			],
			[
				"a media type and the keyword before it",
				"@media ONLY SCREEN{a{b:c}}",
				"@media only screen{a{b:c}}"
			]
		])("is printed lowercase: %s", (_name, css, expected) => {
			expect(min(css)).toBe(expected);
		});

		it.each([
			// A type selector is case-sensitive in XML, where `linearGradient` is
			// its own element.
			["a type selector", "DIV linearGradient{a:b}"],
			["an id and a class", "#Id.Class{a:b}"],
			// HTML matches an attribute name case-insensitively, XML does not, and
			// an attribute's value is case-sensitive in both.
			["an attribute selector", 'a[HREF^="HTTP x"]{b:c}'],
			["a custom property", "a{--Foo:BAR}"],
			["a keyframes name", "@keyframes Spin{0%{a:b}}"],
			["a container name", "@container Card (width>0px){a{b:c}}"],
			["a custom media name", "@media (--Wide){a{b:c}}"],
			// A style query asks whether a custom property holds the token stream
			// written here, which is read as written.
			["a style query", "@container style(--x:Foo){a{b:c}}"],
			["a string in a condition", '@media (font-family:"My Font"){a{b:c}}'],
			["a font family", "a{font-family:Other Face,MyFont}"],
			// A name carrying an escape names its characters by case: `\\G` is not
			// `\\g`.
			["an escaped name", "a{c\\4Flor:red}"]
		])("is left as written: %s", (_name, css) => {
			expect(min(css)).toBe(css);
		});

		// The bytes an engine reads a charset rule as are the literal `@charset "`
		// (CSS Syntax 3 §3.2), so lowercasing one would turn a rule the engine
		// drops into one that sets the sheet's encoding.
		it("leaves a cased `@charset` alone", () => {
			expect(min('@CHARSET "utf-8";a{b:c}')).toBe('@CHARSET "utf-8";a{b:c}');
			expect(min('@charset "utf-8";a{b:c}')).toBe('@charset "utf-8";a{b:c}');
		});

		// Both are the same declaration however they are spelled, so a rule an
		// identical later sibling repeats is dead whichever way each spells it.
		it("makes two spellings of one property the same bytes", () => {
			expect(min("a{color:red}a{COLOR:blue}")).toBe(
				"a{color:red}a{color:blue}"
			);
			expect(min("a{COLOR:red}a{color:red}")).toBe("a{color:red}");
		});

		// A property whose grammar is keywords alone claims no name of the
		// author's, so a top-level identifier in one of its values is a keyword.
		it.each([
			["a{DISPLAY:GRID}", "a{display:grid}"],
			["a{position:ABSOLUTE;float:LEFT}", "a{position:absolute;float:left}"],
			["a{white-space:PRE-WRAP}", "a{white-space:pre-wrap}"],
			["a{transform:NONE}", "a{transform:none}"],
			// A vendor spelling is read as the property it spells.
			["a{-WEBKIT-USER-SELECT:NONE}", "a{-webkit-user-select:none}"]
		])("lowercases the keyword value %s", (css, expected) => {
			expect(min(css)).toBe(expected);
		});

		it.each([
			// Each of these grammars takes a name of the author's somewhere, so an
			// identifier in one may be that name.
			["a name the grammar takes", "a{animation-name:Spin}"],
			["a font family", "a{font-family:Foo}"],
			["a grid area", "a{grid-area:MyArea}"],
			["a will-change property", "a{will-change:Xy}"],
			// A call's arguments follow the function's grammar, not the property's.
			["a call's argument", "a{font-variant-alternates:stylistic(Foo)}"],
			// The engine hands a pending-substitution value back as its tokens were
			// written, so nothing inside one is rewritten.
			[
				"a value holding a substitution",
				"a{text-decoration-line:UNDERLINE var(--x)}"
			],
			["a custom property", "a{--x:DISPLAY GRID}"]
		])("leaves a value identifier alone: %s", (_name, css) => {
			expect(min(css)).toBe(css);
		});

		// The eleven transforms and three units `mdn-data` spells with a capital
		// keep that spelling, which is what every other tool writes.
		it.each([
			["a{transform:TRANSLATEY(5px)}", "a{transform:translateY(5px)}"],
			["a{transform:skewx(1deg)}", "a{transform:skew(1deg)}"],
			["a{transform:SCALEZ(2)}", "a{transform:scaleZ(2)}"],
			["a{width:40Q}", "a{width:40Q}"],
			["a{x:1HZ}", "a{x:1Hz}"],
			["a{x:1KHZ}", "a{x:1kHz}"]
		])("keeps the canonical spelling of %s", (css, expected) => {
			expect(min(css)).toBe(expected);
		});

		// The canonical spelling repairs a name that was shouted; a name already
		// written in one case is left where it is, since the two are the same
		// bytes either way and reading the table for every unit in a stylesheet
		// costs more than the spelling is worth.
		it.each([["a{width:40q}"], ["a{x:1hz}"], ["a{transform:translatey(1px)}"]])(
			"leaves an already-lowercase name alone: %s",
			(css) => {
				expect(min(css)).toBe(css);
			}
		);

		// Until its substitution resolves the engine keeps the value as the tokens
		// it was written as, so a folded name there is a value the CSSOM never
		// reports — and two spellings of one call stop being one declaration.
		it.each([
			["a function", "a{width:CALC(1PX + var(--x))}"],
			["the substitution itself", "a{color:VAR(--x)}"],
			["a url token", "a{background:URL(A.PNG) var(--x)}"],
			["a canonical spelling", "a{transform:TRANSLATEY(var(--x))}"],
			["an env()", "a{color:ENV(safe-area-inset-top)}"]
		])("keeps %s as written inside a substituted value", (_name, css) => {
			expect(min(css)).toBe(css);
		});

		it("still folds a sibling declaration carrying no substitution", () => {
			expect(min("a{color:VAR(--x);display:GRID}")).toBe(
				"a{color:VAR(--x);display:grid}"
			);
		});

		// An `@font-feature-values` sub-rule names feature values, which are
		// `<custom-ident>`s: folding one makes two distinct entries collide.
		it("keeps a font feature value name case-sensitive", () => {
			expect(
				min(
					"@font-feature-values fancy{@styleset{MULTI-def2:2 6;multi-def2:3 4 5}}"
				)
			).toBe(
				"@font-feature-values fancy{@styleset{MULTI-def2:2 6;multi-def2:3 4 5}}"
			);
		});

		it("still folds the at-rules around a feature value, and the rules after", () => {
			expect(
				min("@FONT-FEATURE-VALUES fancy{@STYLESET{Nice-Name:1}}a{COLOR:RED}")
			).toBe("@font-feature-values fancy{@styleset{Nice-Name:1}}a{color:red}");
		});
	});

	it("rewrites a `flex` value to its keyword spelling", () => {
		expect(min("a{flex:0 0 auto}")).toBe("a{flex:none}");
		expect(min("a{flex:1 1 auto}")).toBe("a{flex:auto}");
		// The names match case-insensitively, and the property is printed the one
		// way it matches.
		expect(min("a{FLEX:0 0 AUTO}")).toBe("a{flex:none}");
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

describe("CssSyntax — the per-transform switches", () => {
	/**
	 * @param {string} src css source
	 * @param {import("../lib/css/syntax").CssTransformOptions=} transforms which rewrites to make
	 * @returns {string} the minified serialization
	 */
	const min = (src, transforms) =>
		new SourceProcessor().process(src, { mode: "minify", transforms }).code;

	// One input per switch, minified twice: with everything on, and with that one
	// switch off — so a guard that stops firing fails here rather than quietly
	// making the rewrite unconditional again. `comments` is not one of the
	// booleans, so it has a describe of its own below.
	it.each([
		["shortenColors", "a{color:#ffffff}", "a{color:#fff}", "a{color:#ffffff}"],
		[
			"reduceFunctions",
			"a{width:calc(1px + 2px)}",
			"a{width:3px}",
			"a{width:calc(1px + 2px)}"
		],
		[
			"shortenMediaQueries",
			"@media (min-width:1px){a{b:c}}",
			"@media (width>=1px){a{b:c}}",
			"@media (min-width:1px){a{b:c}}"
		],
		["shortenNumbers", "a{width:0.50px}", "a{width:.5px}", "a{width:0.50px}"],
		["normalizeQuotes", "a{content:'x'}", 'a{content:"x"}', "a{content:'x'}"],
		["removeDeadRules", "a{b:1;b:1}", "a{b:1}", "a{b:1;b:1}"],
		["mergeRules", "a{x:1}b{x:1}", "a,b{x:1}", "a{x:1}b{x:1}"],
		["shortenSelectors", "b,a,b{c:1}", "a,b{c:1}", "b,a,b{c:1}"],
		[
			"shortenValues",
			"a{margin:1px 1px}",
			"a{margin:1px}",
			"a{margin:1px 1px}"
		],
		[
			"mergeLonghands",
			"a{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px}",
			"a{margin:1px 2px}",
			"a{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px}"
		],
		// A shorthand the longhands after it fold into is the same rewrite read
		// from the other end, and answers to the same switch.
		[
			"mergeLonghands",
			"a{margin:1px;margin-top:2px}",
			"a{margin:2px 1px 1px}",
			"a{margin:1px;margin-top:2px}"
		],
		// Taking the `calc()` off a term that means the same bare is the last step
		// of the fold, not a separate one.
		[
			"reduceFunctions",
			"a{width:calc(5px)}",
			"a{width:5px}",
			"a{width:calc(5px)}"
		]
	])("%s", (name, css, on, off) => {
		expect(min(css)).toBe(on);
		expect(min(css, { [name]: false })).toBe(off);
	});

	// A `url()` holds two rewrites, and each answers to its own switch: writing
	// a data URI's percent-escapes as the bytes they name, and taking the quotes
	// off a body that is a url-token without them.
	it.each([
		[undefined, "a{background:url(data:image/svg+xml,<svg></svg>)}"],
		[
			{ normalizeQuotes: false },
			'a{background:url("data:image/svg+xml,<svg></svg>")}'
		]
	])(
		"writes a data URI's escapes as the bytes they name: %s",
		(transforms, expected) => {
			expect(
				min(
					'a{background:url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")}',
					transforms
				)
			).toBe(expected);
		}
	);

	// The embedded-source renderer reads a data URL's payload, which is what the
	// percent-escapes hold — so it is offered the decoded one, and what it hands
	// back is quoted or not as `normalizeQuotes` says.
	describe("a rendered data URL", () => {
		const css = 'a{background:url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")}';
		/**
		 * @param {string} source the payload
		 * @returns {string} it, rewritten
		 */
		const renderEmbeddedSource = (source) =>
			source.replace("<svg>", "<svg id=r>");
		/**
		 * @param {import("../lib/css/syntax").CssTransformOptions=} transforms which rewrites to make
		 * @returns {string} the minified serialization
		 */
		const render = (transforms) =>
			new SourceProcessor().process(css, {
				mode: "minify",
				renderEmbeddedSource,
				transforms
			}).code;

		it("reaches the renderer with the payload decoded", () => {
			expect(render()).toBe(
				"a{background:url(data:image/svg+xml,<svg\\ id=r></svg>)}"
			);
		});

		it("keeps the quotes round what it hands back with quotes off", () => {
			expect(render({ normalizeQuotes: false })).toBe(
				'a{background:url("data:image/svg+xml,<svg id=r></svg>")}'
			);
		});

		// With no renderer the payload is still written as the bytes its escapes
		// name, which is what makes it the same URL either way.
		it("writes the payload out with no renderer", () => {
			expect(min(css)).toBe(
				"a{background:url(data:image/svg+xml,<svg></svg>)}"
			);
		});
	});

	// One option says which comments survive, in the six forms terser's
	// `format.comments` takes.
	describe("comments", () => {
		const css =
			"/*inert*//*! banner *//* @license L */a{b:c}/*# sourceMappingURL=x.map */";
		const banners =
			"/*! banner *//* @license L */a{b:c}/*# sourceMappingURL=x.map */";
		const every =
			"/*inert*//*! banner *//* @license L */a{b:c}/*# sourceMappingURL=x.map */";

		it.each([
			["absent keeps the banners", undefined, banners],
			['"some" keeps the banners', /** @type {const} */ ("some"), banners],
			["true keeps every comment", true, every],
			['"all" keeps every comment', /** @type {const} */ ("all"), every],
			["false keeps none", false, "a{b:c}"],
			["a string is read as a pattern", "banner", "/*! banner */a{b:c}"],
			["a RegExp keeps what it matches", /inert/, "/*inert*/a{b:c}"],
			[
				"a predicate keeps what it accepts",
				/** @type {(comment: string) => boolean} */ (
					(comment) => comment.includes("@license")
				),
				"/* @license L */a{b:c}"
			]
		])("%s", (_name, comments, expected) => {
			expect(min(css, { comments })).toBe(expected);
		});

		// The pragma is a link to a source map rather than a comment, so the two
		// banner levels carry it; a selector the author wrote decides it like any
		// other comment, or `comments` would have a case it cannot express.
		it.each([
			[undefined, true],
			[/** @type {const} */ ("some"), true],
			[/** @type {const} */ ("all"), true],
			[true, true],
			[false, false],
			[/nothing-matches/, false],
			[/** @type {(comment: string) => boolean} */ (() => false), false]
		])("source-map pragma with comments: %s", (comments, kept) => {
			const out = min("a{b:c}/*# sourceMappingURL=x.map */", { comments });
			expect(out.includes("/*# sourceMappingURL=x.map */")).toBe(kept);
		});

		// A `g` flag would carry an index from one comment to the next.
		it("matches a global pattern from the start each time", () => {
			expect(min("a{b:c}/*k1*/d{e:f}/*k2*/", { comments: /k\d/g })).toBe(
				"a{b:c}/*k1*/d{e:f}/*k2*/"
			);
		});
	});

	// Turning one off leaves the rest alone, which is the whole point of naming
	// them one at a time.
	it("leaves every other rewrite on", () => {
		expect(
			min("a{color:#ffffff;margin:1px 1px}", { shortenColors: false })
		).toBe("a{color:#ffffff;margin:1px}");
	});

	// A walk that does not print holds every rewrite on, so no visitor pass
	// inherits a switch from a print that ran before it.
	it("takes an absent option as every rewrite on", () => {
		expect(min("a{color:#ffffff}", {})).toBe("a{color:#fff}");
		expect(min("a{color:#ffffff}", undefined)).toBe("a{color:#fff}");
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
		expect(minify("color:red;};color:blue")).toBe("color:red;color:blue");
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
	/** @import { CssPath } from "../lib/css/syntax" */
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

	it("closes a comment the source left open before writing after it", () => {
		// §4.3.2 runs an unterminated comment to EOF, so a `;` or `}` after it
		// lands inside: `{y/*` grew to `{y/*}` to `{y/*}}` on every pass.
		expect(print("{y/*", "minify")).toBe("{y/**/}");
		expect(print("{y/*", "beautify")).toBe(" {\ny/**/;\n}");
		for (const mode of /** @type {const} */ (["minify", "beautify"])) {
			const once = print("{y/*", mode);
			expect(print(once, mode)).toBe(once);
		}
		// A comment the source did close is written back as it stands.
		expect(print("{y/**/ z", "minify")).toBe("{y/**/ z}");
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
	/** @import { CssEnvironment } from "../lib/css/syntax" */

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
			expect(value("hsl(0 100% 50% / .8)", { browsers: ["chrome 50"] })).toBe(
				"hsl(0 100% 50% / .8)"
			);
			expect(value("rgba(255,0,0,.8)", { browsers: ["chrome 50"] })).toBe(
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

		it("drops an authored alpha that is fully opaque", () => {
			// `ff` is no alpha at all, so the color is spelled as an opaque one —
			// which is shorter and asks nothing of the target's hex-alpha support.
			expect(value("#ffffffff")).toBe("#fff");
			expect(value("#ffff")).toBe("#fff");
			expect(value("#FFFFFFFF")).toBe("#fff");
			expect(value("#000000ff")).toBe("#000");
			expect(value("#abcdefff")).toBe("#abcdef");
			// All the way to the shortest name, as any other opaque color is.
			expect(value("#ff0000ff")).toBe("red");
			// Even where the target reads no hex alpha, this form needing none.
			expect(value("#ffffffff", { browsers: ["chrome 50"] })).toBe("#fff");
			// A real alpha still collapses only as far as it may.
			expect(value("#11223344")).toBe("#1234");
			expect(value("#ffffffaa")).toBe("#fffa");
			expect(value("#fff0")).toBe("#fff0");
		});

		it("shortens a color in a substitution's fallback", () => {
			// The fallback is the property's value, not the function's own
			// argument, so a hash there is as much a color as one written in place.
			expect(value("var(--a,#ffffff)")).toBe("var(--a,#fff)");
			expect(value("var(--a,#ffffffff)")).toBe("var(--a,#fff)");
			expect(value("env(--a,#ffffff)")).toBe("env(--a,#fff)");
			expect(value("var(--a,var(--b,#ffffff))")).toBe("var(--a,var(--b,#fff))");
			// `paint()`'s arguments reach a worklet instead, and a function nothing
			// names is not known to take a color at all.
			expect(value("paint(w,#ffffff)")).toBe("paint(w,#ffffff)");
			expect(value("some-fn(#ffffff)")).toBe("some-fn(#ffffff)");
			expect(value("--my-fn(#ffffff)")).toBe("--my-fn(#ffffff)");
			// A `url()` fragment is an id reference, never a color.
			expect(value("url(#gradient)")).toBe("url(#gradient)");
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
			["40Q"],
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
			// ...but not where that word is itself a length: `zoom` scales the
			// keyword and not the `initial` resolved before it, so the two are one
			// value without a zoom and two under one (measured in headless Chromium:
			// 3px against 1.5px at `zoom:2`).
			["a{outline-width:initial}", "a{outline-width:initial}"],
			["a{text-align:initial}", "a{text-align:start}"],
			// The source carries its own comments, so the queued copy is claimed
			// rather than flushed again after the rule.
			[
				"@container style(--a: /*! keep */ b){.a{color:red}}",
				"@container style(--a: /*! keep */ b){.a{color:red}}"
			],
			// Only decoding tells this at-keyword from `@namespace`, so the empty
			// rule the prologue needs is kept either way.
			[
				".e{}@name\\73pace url(x);.a{color:red}",
				".e{}@name\\73pace url(x);.a{color:red}"
			],
			["a{font-size:initial}", "a{font-size:initial}"]
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
			["a{transition:all 1s ease}", "a{transition:1s}"],
			["a{transition:opacity 1s normal}", "a{transition:opacity 1s}"],
			// A comma parts two layers, and each holds its own set of slots.
			[
				"a{transition:opacity 1s ease,color 1s ease}",
				"a{transition:opacity 1s,color 1s}"
			],
			[
				"a{transition:all .3s cubic-bezier(.4,0,.2,1),color .2s ease}",
				"a{transition:.3s cubic-bezier(.4,0,.2,1),color.2s}"
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
			// `all` is the property a layer naming none transitions, so it is spare
			// beside anything else — but it is what a layer left alone still says.
			["a{transition:all .5s}", "a{transition:.5s}"],
			["a{transition:ALL .5s}", "a{transition:.5s}"],
			["a{transition:all 5s linear}", "a{transition:5s linear}"],
			["a{transition:all .5s 1s}", "a{transition:.5s 1s}"],
			[
				"a{transition:all .5s allow-discrete}",
				"a{transition:.5s allow-discrete}"
			],
			["a{transition:all .5s,opacity 1s}", "a{transition:.5s,opacity 1s}"],
			["a{-webkit-transition:all .5s}", "a{-webkit-transition:.5s}"],
			["a{transition:all}", "a{transition:all}"],
			// The zero duration goes first, which leaves `all` standing alone.
			["a{transition:all 0s}", "a{transition:all}"],
			["a{transition:none .5s}", "a{transition:none.5s}"],
			["a{transition-property:all}", "a{transition-property:all}"],
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
			["a{TRANSITION:opacity 1s EASE}", "a{transition:opacity 1s}"]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			[
				"the keyword is not the initial",
				"a{transition:height.35s ease-in-out}"
			],
			// `none` is both an animation name and a fill mode, so which slot it
			// fills is not a question the grammar answers.
			["two slots name the keyword", "a{animation:x 1s none}"],
			["the same, on a list style", "a{list-style:none}"],
			// `mask: url(…) none` fills `<mask-reference>` twice and is a declaration
			// the engine drops — removing the `none` would revive it.
			["a sibling fills the same slot", "a{mask:url(a.svg)none}"],
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
			[
				"a layer holds a string",
				'a{transition:"a" 1s ease}',
				'a{transition:"a"1s ease}'
			],
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
		])("keeps it where %s", (_name, css, printed = css) => {
			expect(minify(css)).toBe(printed);
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

	describe("a later declaration of a property already written", () => {
		it.each([
			// A differently spelled value is a fallback, and a bare name says nothing
			// about which engines read it: it may be invalid...
			"a{color:red;color:not-a-color}",
			// ...or newer than the value before it, in which case an older one does:
			// `canvas` is a CSS Color 4 system color.
			"a{color:red;color:canvas}",
			// A unit newer than the property is the same pair spelled with a number.
			"a{width:100vw;width:100dvw}"
		])("keeps both where they are spelled differently: %s", (css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a transition duration of zero", () => {
		it.each([
			["a{transition:visibility 0s}", "a{transition:visibility}"],
			["a{transition:visibility 0ms}", "a{transition:visibility}"],
			[
				"a{transition:visibility 0s,color 0s}",
				"a{transition:visibility,color}"
			],
			[
				"a{-webkit-transition:visibility 0s}",
				"a{-webkit-transition:visibility}"
			]
		])("drops it: %s", (css, out) => {
			expect(minify(css)).toBe(out);
		});

		it.each([
			// The second `<time>` is the delay: dropping the duration would hand the
			// delay's value to it.
			"a{transition:visibility 0s 2s}",
			// Nothing would be left to say it about.
			"a{transition:0s}"
		])("keeps it: %s", (css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a vendor spelling of a property it minifies", () => {
		it.each([
			[
				"-webkit-transition:background-color .25s ease",
				"-webkit-transition:background-color.25s"
			],
			["-webkit-animation:fade 3s ease", "-webkit-animation:fade 3s"],
			[
				"-webkit-transform-origin:center bottom",
				"-webkit-transform-origin:50%100%"
			],
			[
				"-webkit-box-shadow:0 1px 5px 0 rgba(0,0,0,0.2)",
				"-webkit-box-shadow:0 1px 5px#0003"
			]
		])("minifies it the way the property it spells is: %s", (css, out) => {
			expect(minify(`a{${css}}`)).toBe(`a{${out}}`);
		});

		it("reads the spelling off the prefix table, not off the `-`", () => {
			// `-webkit-appearance` is its own property, not a spelling of one whose
			// value rules could stand in for it.
			expect(minify("a{-webkit-appearance:none}")).toBe(
				"a{-webkit-appearance:none}"
			);
		});
	});

	describe("a rule an identical later sibling makes dead", () => {
		it("drops the earlier of two, whatever stands between", () => {
			expect(minify("@media all{a{color:red}b{color:blue}a{color:red}}")).toBe(
				"@media all{b{color:blue}a{color:red}}"
			);
		});

		it("drops it across a streamed block, written straight out", () => {
			let filler = "";
			for (let i = 0; i < 4000; i++) filler += `.f${i}{color:red}`;
			const out = minify(`@media all{.a{top:0}${filler}.a{top:0}}`);
			expect(out.match(/\.a\{top:0\}/g)).toHaveLength(1);
			// The surviving copy is the last one: an earlier one would be read where
			// the later is, which is what a rule between them can override.
			expect(out.endsWith(".a{top:0}}")).toBe(true);
		});

		it("keeps the one between, which says what neither of them does", () => {
			expect(minify("@media all{a{color:red}a{color:blue}a{color:red}}")).toBe(
				"@media all{a{color:blue}a{color:red}}"
			);
		});

		it.each([
			// `@import` and `@namespace` are read only ahead of the rules they
			// precede, so where they stand is what they say.
			'@media all{@import"a.css";b{top:0}@import"a.css"}',
			"@media all{@namespace x url(u);b{top:0}@namespace x url(u)}"
		])("keeps both: %s", (css) => {
			expect(minify(css)).toBe(css);
		});

		it("keeps one standing in front of a `@namespace` that could still be read", () => {
			// Taking it back would move the `@namespace` up to where an engine reads
			// it, which is not what the sheet said.
			const css = '.a{x:1}@namespace u "urn:z";.b{y:1}.a{x:1}';
			expect(minify(css)).toBe(css);
		});

		it("moves the rules after a cut back by what went", () => {
			// Two cuts in one block: the second names its rule at the offset the
			// first left it at, not the one it was written at.
			expect(
				minify(
					"@media a{.p{x:1}.q{y:2}.r{z:3}}.z{t:1}@media a{.p{x:1}}.z2{t:2}@media a{.r{z:3}}"
				)
			).toBe(
				"@media a{.q{y:2}}.z{t:1}@media a{.p{x:1}}.z2{t:2}@media a{.r{z:3}}"
			);
		});

		it("counts a raw passthrough among the children it stands between", () => {
			// It carries no rules of its own, but its parent still counts it — without
			// its place, the rules after it are cut at the offsets of the ones before.
			expect(
				minify("@media all{*zoom:1;.b{.c{z:1}}}.z{q:1}@media all{.b{.c{z:1}}}")
			).toBe("@media all{*zoom:1}.z{q:1}@media all{.b{.c{z:1}}}");
		});

		it.each([
			// CSS Cascade 5 §6.4.1: an `!important` declaration is read from the
			// earliest layer, so a copy in a later one makes nothing dead.
			[
				"an important copy stands in a later anonymous layer",
				"@layer{.a{color:red!important}}@layer{.a{color:blue!important}}@layer{.a{color:red!important}}"
			],
			[
				"two anonymous layers say the same rule",
				"@layer{a{color:red}}@layer{a{color:red}}"
			],
			[
				"the layers spell their name with an escape",
				"@media all{@l\\61yer{.a{c:red}}@l\\61yer{.a{c:blue}}}"
			]
		])("keeps both where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		it("drops one the same anonymous layer says again", () => {
			expect(minify("@layer{.a{c:red}.x{y:1}.a{c:red}}")).toBe(
				"@layer{.x{y:1}.a{c:red}}"
			);
		});

		it("drops one nested in a rule, which is what encloses it", () => {
			expect(minify(".a{.b{color:red}.x{color:teal}.b{color:red}}")).toBe(
				".a{.x{color:teal}.b{color:red}}"
			);
		});

		it("drops one nested in two rules that differ elsewhere", () => {
			// The whole rule is not repeated — only what it nests — and the `;` the
			// cut leaves in front of the `}` goes with it.
			expect(minify(".a{q:1;.b{x:1}}.z{y:1}.a{w:2;.b{x:1}}")).toBe(
				".a{q:1}.z{y:1}.a{w:2;.b{x:1}}"
			);
		});

		it("drops the rule a cut empties, as an empty one written here would be", () => {
			expect(minify(".a{.b{.c{d:1}}}.z{t:1}.a{w:2;.b{.c{d:1}}}")).toBe(
				".z{t:1}.a{w:2;.b{.c{d:1}}}"
			);
		});

		it.each([
			// What a rule nests is read under it, so the same selector under another
			// rule — or under none — is another rule.
			[".a{.b{color:red}}.c{.b{color:red}}"],
			[".b{color:red}.a{.b{color:red}}"]
		])("keeps both where the enclosing rule differs: %s", (css) => {
			expect(minify(css)).toBe(css);
		});

		it("leaves a layer to the merge, which gathers it rather than dropping it", () => {
			expect(
				minify(
					"@media all{@layer x{a{top:0}}@layer y{b{top:1px}}@layer x{a{top:0}}}"
				)
			).toBe("@media all{@layer x{a{top:0}a{top:0}}@layer y{b{top:1px}}}");
		});
	});

	describe("a named layer block a later sibling opens again", () => {
		it("gathers them, since both are the one layer", () => {
			expect(
				minify(
					"@media all{@layer x{a{color:red}}@layer y{b{color:blue}}@layer x{c{color:lime}}}"
				)
			).toBe(
				"@media all{@layer x{a{color:red}c{color:lime}}@layer y{b{color:blue}}}"
			);
		});

		it("gathers the stylesheet's own children as well", () => {
			expect(
				minify(
					"@layer x{a{color:red}}@layer y{b{color:blue}}@layer x{c{color:lime}}"
				)
			).toBe("@layer x{a{color:red}c{color:lime}}@layer y{b{color:blue}}");
		});

		it("gathers into a block a join already grew", () => {
			expect(
				minify("@layer x{a{top:0}}@layer x{b{top:0}}@layer x{c{left:0}}")
			).toBe("@layer x{a,b{top:0}c{left:0}}");
		});

		it("gathers into one whose own block is empty", () => {
			// Gathering keeps the layer where the empty block put it in the cascade.
			expect(minify("@layer a{}@layer a{i{t:0}}")).toBe("@layer a{i{t:0}}");
		});

		it("gathers past enough nodes to stream the block", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:0}`;
			const out = minify(
				`@media all{@layer x{a{color:red}}${filler}@layer x{c{color:lime}}}`
			);
			expect(
				out.startsWith("@media all{@layer x{a{color:red}c{color:lime}}")
			).toBe(true);
			expect(out.endsWith(`${filler}}`)).toBe(true);
		});

		it("gathers past enough nodes to stream, but not past that layer again", () => {
			let filler = "";
			for (let i = 0; i < 17000; i++) filler += `.f${i}{top:0}`;
			const css = `@media all{@layer x{a{color:red}}${filler}.y{@layer x{b{top:0}}}@layer x{c{color:lime}}}`;
			expect(minify(css)).toBe(css);
		});

		it.each([
			// A block writing only into its own layer reaches nothing the one
			// between them writes, so the two never contend.
			[
				"a block for a layer under it stands between them",
				"@layer a.b{.x{top:0}}@layer a.b.c{.y{top:0}}@layer a.b{.z{top:0}}",
				"@layer a.b{.x{top:0}.z{top:0}}@layer a.b.c{.y{top:0}}"
			],
			[
				"a block for the layer above it stands between them",
				"@layer a.b{.x{top:0}}@layer a{.y{top:0}}@layer a.b{.z{top:0}}",
				"@layer a.b{.x{top:0}.z{top:0}}@layer a{.y{top:0}}"
			]
		])("gathers where %s", (_name, css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// A layer with no name is a layer of its own.
			[
				"neither is named",
				"@media all{@layer{a{color:red}}@layer{b{color:red}}}"
			],
			// `@layer a.b` writes where `@layer a{@layer b{…}}` writes, so the one
			// between them is that same layer under its other spelling.
			[
				"the one between opens that layer the other way",
				"@layer base.support{.a{top:0}}@layer base{@layer support{.b{top:1px}}}@layer base.support{.c{top:2px}}"
			],
			[
				"the two spell it nested and the one between does not",
				"@layer base{@layer support{.a{top:0}}}@layer base.support{.b{top:1px}}@layer base{@layer support{.c{top:2px}}}"
			],
			// Reached the other way round, the block between them is that same layer,
			// and the order within a layer is one the cascade reads.
			[
				"a rule between them opens that layer again",
				"@layer a{i{top:0}}.x{@layer a{j{top:0}}}@layer a{k{top:0}}"
			],
			[
				"a rule inside the block between them opens it again",
				"@media all{@layer a{i{top:0}}.x{@layer a{j{top:0}}}@layer a{k{top:0}}}"
			],
			// A kept comment was written above what follows it, so nothing moves back
			// over one.
			[
				"a kept comment stands between them",
				"@layer a{i{top:0}}/*! keep */@layer a{j{top:0}}"
			],
			// `@layer a.b` is not `@layer a`.
			[
				"one names a layer nested in the other",
				"@layer a{i{top:0}}@layer a.b{j{top:0}}"
			]
		])("keeps both where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("a comma list a later declaration writes again", () => {
		it.each([
			// The item slot takes a `<custom-ident>`, so an engine knowing neither
			// spelling still parses the value and has nothing to fall back to.
			[
				"a{transition:box-shadow .25s;transition:box-shadow .25s,-webkit-box-shadow .25s}",
				"a{transition:box-shadow.25s,-webkit-box-shadow.25s}"
			],
			// ...whichever spelling the earlier one wrote
			[
				"a{transition:-webkit-box-shadow .25s;transition:box-shadow .25s,-webkit-box-shadow .25s}",
				"a{transition:box-shadow.25s,-webkit-box-shadow.25s}"
			],
			// ...and for a keyframes name, which is a `<custom-ident>` too
			[
				"a{animation:spin 1s;animation:spin 1s,-webkit-spin 1s}",
				"a{animation:spin 1s,-webkit-spin 1s}"
			],
			// A comma inside a call parts that call's arguments, not the list's items.
			[
				"a{transition:a cubic-bezier(.1,0,1,1);transition:a cubic-bezier(.1,0,1,1),-webkit-a cubic-bezier(.1,0,1,1)}",
				"a{transition:a cubic-bezier(.1,0,1,1),-webkit-a cubic-bezier(.1,0,1,1)}"
			],
			// ...nor does one inside a string, escapes and all — the quote the printer
			// swapped to drop the escape is on both sides, so they still match.
			[
				'a{font-family:-webkit-a,"x\\",y";font-family:a,-webkit-a,"x\\",y"}',
				"a{font-family:a,-webkit-a,'x\",y'}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			// `-webkit-ease` is no `<easing-function>`, so that declaration is one an
			// engine drops — which is what the earlier one is there for.
			[
				"the item slot takes no `<custom-ident>`",
				"a{transition-timing-function:ease;transition-timing-function:ease,-webkit-ease}"
			],
			// A `<custom-ident>` reached inside a function's arguments is that
			// function's, and a function is a thing an engine may not know.
			[
				"the added item is a call",
				"a{background-image:linear-gradient(red,blue);background-image:linear-gradient(red,blue),-webkit-linear-gradient(red,blue)}"
			],
			// Nothing says the added item parses wherever the kept ones do.
			[
				"the added item is not one of the earlier ones respelled",
				"a{transition:opacity 1s;transition:opacity 1s,-webkit-transform 1s}"
			],
			// The earlier one is not written again at all.
			[
				"an item of the earlier one is missing",
				"a{transition:opacity 1s,width 1s;transition:opacity 1s,-webkit-opacity 1s}"
			],
			// An `!important` earlier one wins whatever the later writes.
			[
				"the earlier one is `!important`",
				"a{transition:opacity 1s!important;transition:opacity 1s,-webkit-opacity 1s}"
			],
			// The later one writes fewer items than the earlier, so it cannot be
			// writing all of them again.
			[
				"the later one is the shorter list",
				"a{transition:a 1s,b 2s,c 3s;transition:-webkit-a 1s}"
			]
		])("declines where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});
	});

	describe("sibling rules printing the same block", () => {
		it.each([
			["a{color:red}b{color:red}", "a,b{color:red}"],
			["a{color:red}b{color:red}c{color:red}", "a,b,c{color:red}"],
			[".a[x=1]{top:0}.b>.c{top:0}", ".a[x=1],.b>.c{top:0}"],
			// A `:` an ident escapes, and one an attribute's string holds, both sit
			// in a selector every engine parses — only a pseudo keeps a rule out.
			[".sm\\:flex{top:0}.b{top:0}", ".sm\\:flex,.b{top:0}"],
			['[href="a:b"]{top:0}.b{top:0}', '[href="a:b"],.b{top:0}'],
			["@media x{a{top:0}b{top:0}}", "@media x{a,b{top:0}}"],
			// A named layer is one layer however many blocks open it.
			["@layer x{a{top:0}}@layer x{b{top:0}}", "@layer x{a,b{top:0}}"],
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
			["a{color:red}a{color:red}", "a{color:red}"],
			// A pseudo every engine reads joins like any other compound.
			["a:hover{top:0}b:hover{top:0}", "a:hover,b:hover{top:0}"],
			["[a=b]:hover{top:0}.b{top:0}", "[a=b]:hover,.b{top:0}"],
			[
				"a:nth-child(2){top:0}b::before{top:0}",
				"a:nth-child(2),b:before{top:0}"
			]
		])("%s", (css, expected) => {
			expect(minify(css)).toBe(expected);
		});

		it.each([
			["the blocks differ", "a{color:red}b{color:blue}"],
			// Nothing stands between two rules a join puts together, so a rule that
			// does keeps them apart whatever it writes.
			["a rule stands between them", "a{color:red}i{margin-top:0}b{color:red}"],
			// One selector the engine cannot parse invalidates the whole list, so a
			// pseudo no target is known to read keeps its rule out of one.
			["a pseudo is a prefixed one", "a{top:0}::-moz-placeholder{top:0}"],
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
			["a matcher carries a modifier past `i`", "[a=b s]{top:0}[c]{top:0}"],
			// CSS Cascade 5 §6.4.1: every `@layer {` opens a layer of its own, and the
			// later one wins whatever the selectors say.
			[
				"each anonymous layer is a layer of its own",
				"@layer{#i{color:blue}}@layer{.c{color:red}}"
			]
		])("keeps both rules where %s", (_name, css) => {
			expect(minify(css)).toBe(css);
		});

		it("joins a pseudo only where every target browser reads it", () => {
			const css = "a:focus-visible{top:0}b:focus-visible{top:0}";
			const joined = "a:focus-visible,b:focus-visible{top:0}";
			// Chrome 86 is where it arrived; 85 is the release before it.
			expect(minifyFor(css, ["chrome 86"])).toBe(joined);
			expect(minifyFor(css, ["chrome 85"])).toBe(css);
			// One browser short of it holds the whole selection back.
			expect(minifyFor(css, ["chrome 130", "safari 15.3"])).toBe(css);
			expect(minifyFor(css, ["chrome 130", "safari 15.4"])).toBe(joined);
			// No selection names no browser to answer for, so it is assumed.
			expect(minify(css)).toBe(joined);
			// A pseudo nothing states support for never joins, at any target.
			const unknown = "a:totally-made-up{top:0}b:totally-made-up{top:0}";
			expect(minifyFor(unknown, ["chrome 130"])).toBe(unknown);
			expect(minify(unknown)).toBe(unknown);
		});

		it("answers a pseudo again when the selection changes under it", () => {
			// Cached per spelling while the selection holds, so a different one has
			// to throw that away rather than read the first's answer.
			const css = "a:focus-visible{top:0}b:focus-visible{top:0}";
			const joined = "a:focus-visible,b:focus-visible{top:0}";
			expect(minifyFor(css, ["chrome 86"])).toBe(joined);
			expect(minifyFor(css, ["chrome 85"])).toBe(css);
			expect(minifyFor(css, ["chrome 86"])).toBe(joined);
			// The same stylesheet twice under one selection reads the cache.
			expect(minifyFor(css, ["chrome 86"])).toBe(joined);
			// And with the selection gone the ability is assumed again.
			expect(minify(css)).toBe(joined);
			expect(minifyFor(css, ["chrome 85"])).toBe(css);
		});

		it.each([
			// One block holds a property once, so the earlier declaration of a
			// property both of them set would be the one it loses.
			["they set the same property", "a{color:red}a{color:blue}"],
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
			// Nothing stands between two at-rules a join puts together.
			[
				"a rule stands between them",
				"@media x{a{top:0}}i{left:0}@media x{b{top:0}}"
			],
			// A layer with no name is a layer of its own, so two of them are never
			// one block however they are written.
			[
				"the layer they open has no name",
				"@layer{#i{color:blue}}@layer{.c{color:red}}"
			]
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

		it("prints the whole sheet after a parse threw mid-print", () => {
			// The rule held back for a join is one per process, so a parse that threw
			// while holding one must not leave it for the next parse to write out.
			let seen = 0;
			expect(() =>
				new SourceProcessor()
					.use({
						[NodeType.QualifiedRule]: () => {
							if (++seen === 2) throw new Error("thrown mid-parse");
						}
					})
					.process(".held{left:0}.threw{left:0}", { mode: "minify" })
			).toThrow("thrown mid-parse");
			expect(minify("a{top:0}b{top:1px}c{top:2px}")).toBe(
				"a{top:0}b{top:1px}c{top:2px}"
			);
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
			],
			// The components are as authored, so a zero is as often `0px` as `0` —
			// the zero-unit drop only prints later.
			["a{box-shadow:0px 0px 0px 0px red}", "a{box-shadow:0 0 red}"],
			["a{box-shadow:1px 1px 0em 0rem red}", "a{box-shadow:1px 1px red}"],
			[
				"a{box-shadow:0px 0px 0px 1px red inset,0px 0em 0px 0px blue inset}",
				"a{box-shadow:0 0 0 1px red inset,0 0 blue inset}"
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
			// `0%` is a percentage, which a shadow's `<length>` slots do not take.
			["a percentage is no zero length", "a{box-shadow:1px 1px 0%0%red}"],
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
			["the same, past a call", "a{mask:url(a.svg)none}"],
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
			[
				"it is the `font` shorthand",
				'a{font:12px "Foo Bar"}',
				'a{font:12px"Foo Bar"}'
			],
			["the property takes a string", 'a{content:"Foo Bar"}'],
			["it is a custom property's value", 'a{--x:"Foo Bar"}']
		])("keeps the quotes where %s", (_name, css, printed = css) => {
			expect(minify(css)).toBe(printed);
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
					browsers: ["chrome 50"]
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
			["a{border:1px solid white}", "a{border:1px solid#fff}"],
			[
				"a{box-shadow:0 0 1px lightgoldenrodyellow}",
				"a{box-shadow:0 0 1px#fafad2}"
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
			// The shorthand takes the three that follow it — they are its own slots,
			// written after it — but the one before it stays where it is.
			[
				"the shorthand itself",
				"margin:9px",
				"a{margin-top:1px;margin:9px 2px 1px}"
			],
			["a logical property", "margin-inline:9px", null],
			["`all`", "all:unset", null]
		])("declines across %s", (_name, between, expected) => {
			const css = `a{margin-top:1px;${between};margin-right:2px;margin-bottom:1px;margin-left:2px}`;
			expect(minify(css)).toBe(expected === null ? css : expected);
		});

		it("steps over a child rule standing outside the family", () => {
			// A nested rule is no declaration, so it is not in the adjacency scan —
			// but only one *between* the longhands is one the merge moves.
			expect(
				minify(
					"a{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px;&:hover{color:red}}"
				)
			).toBe("a{margin:1px 2px;&:hover{color:red}}");
			expect(
				minify(
					"a{@supports (color:red){color:red}margin-inline-start:1px;margin-inline-end:2px}"
				)
			).toBe("a{@supports (color:red){color:red}margin-inline:1px 2px}");
		});

		it("declines across a child rule, which may write the family itself", () => {
			// What the rule sets is not read here, so every one of them blocks: a
			// nested `@supports` re-declaring a longhand is the common shape.
			const supports =
				"a{margin-inline-start:1px;@supports (color:red){margin-inline-start:9px}margin-inline-end:2px}";
			expect(minify(supports)).toBe(supports);
			const nested =
				"a{margin-top:1px;margin-right:2px;&:hover{color:red}margin-bottom:1px;margin-left:2px}";
			expect(minify(nested)).toBe(nested);
			// One family blocked leaves the other free.
			expect(
				minify(
					"a{margin-top:1px;margin-right:2px;margin-bottom:1px;margin-left:2px;padding-top:1px;&:hover{x:1}padding-right:2px;padding-bottom:1px;padding-left:2px}"
				)
			).toBe(
				"a{margin:1px 2px;padding-top:1px;&:hover{x:1}padding-right:2px;padding-bottom:1px;padding-left:2px}"
			);
		});

		it("declines a merge mixing a bare number with a length", () => {
			// `.25` is no length, so the engine kept the other three — merging writes
			// `padding:0 0 .25`, which it drops whole, losing all four.
			const bare =
				"a{padding-top:0;padding-right:0;padding-bottom:.25;padding-left:0}";
			expect(minify(bare)).toBe(bare);
			// A keyword is no bare number, so a slot holding one still merges.
			expect(
				minify(
					"a{margin-top:auto;margin-right:0;margin-bottom:0;margin-left:0}"
				)
			).toBe("a{margin:auto 0 0}");
			expect(
				minify(
					"a{padding-top:1px;padding-right:2px;padding-bottom:1px;padding-left:2px}"
				)
			).toBe("a{padding:1px 2px}");
		});

		it("folds a longhand into the shorthand it follows", () => {
			expect(minify("a{border-width:0;border-bottom-width:1px}")).toBe(
				"a{border-width:0 0 1px}"
			);
			expect(minify("a{padding:0;padding-bottom:1rem}")).toBe(
				"a{padding:0 0 1rem}"
			);
			// Each following longhand folds into what the last one left.
			expect(minify("a{margin:0;margin-top:1px;margin-bottom:2px}")).toBe(
				"a{margin:1px 0 2px}"
			);
			// A pair shorthand folds by the same rule.
			expect(minify("a{gap:1px;column-gap:2px}")).toBe("a{gap:1px 2px}");
			// One saying again what the shorthand already set leaves just the one.
			expect(minify("a{margin:1px;margin-top:1px}")).toBe("a{margin:1px}");
		});

		it("declines a fold the two declarations do not allow", () => {
			// Anything between them is read between them.
			const parted = "a{margin:0;color:red;margin-top:1px}";
			expect(minify(parted)).toBe(parted);
			// An `!important` longhand is not the same declaration as a plain one.
			const important = "a{margin:0!important;margin-top:1px}";
			expect(minify(important)).toBe(important);
			// A substitution may stand for any number of slots, on either side.
			const inShorthand = "a{margin:var(--m);margin-top:1px}";
			expect(minify(inShorthand)).toBe(inShorthand);
			const inLonghand = "a{margin:0;margin-top:var(--t)}";
			expect(minify(inLonghand)).toBe(inLonghand);
			// A longhand of another family is no slot of this shorthand.
			const other = "a{margin:0;padding-top:1px}";
			expect(minify(other)).toBe(other);
			// A component the shorthand cannot read makes the whole of it invalid, so
			// two values of different kinds do not fold.
			const bare = "a{padding:0;padding-bottom:.25}";
			expect(minify(bare)).toBe(bare);
			const color = "a{padding:0;padding-bottom:red}";
			expect(minify(color)).toBe(color);
			const percentage = "a{border-width:0;border-bottom-width:50%}";
			expect(minify(percentage)).toBe(percentage);
			// A keyword is the same question, so `auto` beside a length declines.
			const keyword = "a{margin:auto;margin-top:25px}";
			expect(minify(keyword)).toBe(keyword);
			const pair = "a{overflow:auto;overflow-y:hidden}";
			expect(minify(pair)).toBe(pair);
		});

		it("declines `inset` when the target cannot read the shorthand", () => {
			const css = "a{top:1px;right:2px;bottom:1px;left:2px}";
			expect(minify(css, { browsers: ["chrome 50"] })).toBe(css);
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

		it("collapses `overflow` to one value whatever the target", () => {
			expect(minify("a{overflow-x:hidden;overflow-y:hidden}")).toBe(
				"a{overflow:hidden}"
			);
			expect(
				minifyFor("a{overflow-x:hidden;overflow-y:hidden}", ["ie 11"])
			).toBe("a{overflow:hidden}");
		});

		it("declines the `place-*` pairs a target cannot read", () => {
			const off = { browsers: ["chrome 50"] };
			const items = "a{align-items:center;justify-items:center}";
			expect(minifyFor(items, undefined, off)).toBe(items);
			const self = "a{align-self:center;justify-self:end}";
			expect(minifyFor(self, undefined, off)).toBe(self);
			const content = "a{align-content:center;justify-content:end}";
			expect(minifyFor(content, undefined, off)).toBe(content);
			// The same block is merged where the target reads the shorthand.
			expect(minify(items)).toBe("a{place-items:center}");
			expect(minify(self)).toBe("a{place-self:center end}");
			expect(minify(content)).toBe("a{place-content:center end}");
		});

		it("keeps reading the target when prefixes are turned off", () => {
			// `vendorPrefixes` turns off the prefixes alone: the selection still says
			// which spellings the target reads.
			const css = "a{top:0;right:0;bottom:0;left:0}";
			const off = { browsers: ["ie 11"], vendorPrefixes: false };
			expect(minifyFor(css, undefined, off)).toBe(css);
			expect(minifyFor(css, ["ie 11"])).toBe(css);
			expect(minify(css)).toBe("a{inset:0}");
			// And the prefixes themselves still answer to it.
			expect(minifyFor("a{display:flex}", ["ie 10"])).toBe(
				"a{display:-ms-flexbox;display:flex}"
			);
			expect(
				minifyFor("a{display:flex}", undefined, {
					browsers: ["ie 10"],
					vendorPrefixes: false
				})
			).toBe("a{display:flex}");
		});

		it("writes `overflow`'s two-value form only where the target reads it", () => {
			const two = "a{overflow-x:auto;overflow-y:hidden}";
			// Chrome 68 is where the two-value form arrived.
			expect(minifyFor(two, ["chrome 68"])).toBe("a{overflow:auto hidden}");
			expect(minifyFor(two, ["chrome 67"])).toBe(two);
			expect(minifyFor(two, ["ie 11"])).toBe(two);
			expect(minify(two)).toBe("a{overflow:auto hidden}");
			// Collapsing to one value is as old as the longhands, so it always runs.
			const one = "a{overflow-x:auto;overflow-y:auto}";
			expect(minifyFor(one, ["ie 11"])).toBe("a{overflow:auto}");
			expect(minify(one)).toBe("a{overflow:auto}");
		});

		it.each([
			// `left` / `right` are `justify-*`'s alone, so the shorthand is invalid
			// whole where the `justify-*` declaration alone was read.
			"a{align-items:left;justify-items:left}",
			"a{align-self:left;justify-self:left}",
			"a{align-content:right;justify-content:right}",
			// ...and a `<baseline-position>` is `align-content`'s alone, the other way
			// round: `justify-content` does not take one.
			"a{align-content:baseline;justify-content:baseline}"
		])("declines a pair over a keyword only one half takes: %s", (css) => {
			expect(minify(css)).toBe(css);
		});

		// The keyword matches case-insensitively, and `align-items` is keywords
		// alone, so it prints the one way it matches.
		it("declines the pair whatever case the keyword is written in", () => {
			expect(minify("a{align-items:RIGHT;justify-items:RIGHT}")).toBe(
				"a{align-items:right;justify-items:right}"
			);
		});

		it("merges a pair over a keyword both halves take", () => {
			expect(minify("a{align-items:baseline;justify-items:baseline}")).toBe(
				"a{place-items:baseline}"
			);
			expect(minify("a{align-content:center;justify-content:end}")).toBe(
				"a{place-content:center end}"
			);
		});

		it("refuses a pair the box collapse would refuse", () => {
			// A CSS-wide keyword beside another value is a shorthand no engine
			// accepts, and a `var()` may expand to both values at once.
			const wide = "a{margin-block-start:inherit;margin-block-end:1px}";
			expect(minify(wide)).toBe(wide);
			const sub = "a{margin-block-start:var(--x);margin-block-end:var(--x)}";
			expect(minify(sub)).toBe(sub);
		});

		it("refuses a slash shorthand the same two ways a box refuses", () => {
			// A `var()` may expand across the `/` into another slot, and a CSS-wide
			// keyword beside another value is a shorthand the engine drops whole.
			expect(
				minify(
					"a{grid-row-start:1;grid-column-start:2;grid-row-end:3;grid-column-end:4}"
				)
			).toBe("a{grid-area:1/2/3/4}");
			const sub =
				"a{grid-row-start:1;grid-column-start:2;grid-row-end:var(--x);grid-column-end:4}";
			expect(minify(sub)).toBe(sub);
			const wide =
				"a{grid-row-start:inherit;grid-column-start:2;grid-row-end:3;grid-column-end:4}";
			expect(minify(wide)).toBe(wide);
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
			// A logical edge states its physical twin's grammar, so its slots are read
			// off that one and written back onto its own longhands.
			expect(
				minify(
					"a{border-inline-start-width:1px;border-inline-start-style:solid;border-inline-start-color:red}"
				)
			).toBe("a{border-inline-start:1px solid red}");
			expect(
				minify(
					"a{border-block-end-style:dashed;border-block-end-width:2px;border-block-end-color:#00f}"
				)
			).toBe("a{border-block-end:2px dashed #00f}");
			// `border` itself resets `border-image`, which its three longhands leave
			// alone, so the four-sided family is no family of this merge — nor is the
			// four-sided one below it, for the same reason.
			const sided = "a{border-width:1px;border-style:solid;border-color:red}";
			expect(minify(sided)).toBe(sided);
			const edges =
				"a{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}";
			expect(minify(edges)).toBe(edges);
			expect(minify("a{text-wrap-mode:nowrap;text-wrap-style:balance}")).toBe(
				"a{text-wrap:nowrap balance}"
			);
			expect(minify('a{text-emphasis-style:"x";text-emphasis-color:red}')).toBe(
				'a{text-emphasis:"x" red}'
			);
		});

		it("merges an ordered shorthand's slots by position", () => {
			expect(minify("a{flex-grow:2;flex-shrink:3;flex-basis:10px}")).toBe(
				"a{flex:2 3 10px}"
			);
			// Shortened the way an authored shorthand is: the two keyword spellings,
			// the shrink an omitted one leaves, and the basis an omitted one leaves.
			expect(minify("a{flex-grow:0;flex-shrink:0;flex-basis:auto}")).toBe(
				"a{flex:none}"
			);
			expect(minify("a{flex-grow:1;flex-shrink:1;flex-basis:auto}")).toBe(
				"a{flex:auto}"
			);
			expect(minify("a{flex-grow:0;flex-shrink:1;flex-basis:auto}")).toBe(
				"a{flex:0 auto}"
			);
			expect(minify("a{flex-grow:1;flex-shrink:2;flex-basis:0%}")).toBe(
				"a{flex:1 2}"
			);
			expect(minify("a{flex-grow:1;flex-shrink:1;flex-basis:0%}")).toBe(
				"a{flex:1}"
			);
			// §7.1.1 reads a unitless zero not preceded by two factors as a factor,
			// so the basis stays where dropping the shrink would make it one.
			expect(minify("a{flex-grow:1;flex-shrink:1;flex-basis:0}")).toBe(
				"a{flex:1 1 0}"
			);
		});

		it("declines an ordered merge the slots do not allow", () => {
			// A substitution may stand for any number of slots.
			const substituted = "a{flex-grow:var(--g);flex-shrink:1;flex-basis:auto}";
			expect(minify(substituted)).toBe(substituted);
			// A CSS-wide keyword beside another value is a shorthand engines drop.
			const wide = "a{flex-grow:1;flex-shrink:inherit;flex-basis:auto}";
			expect(minify(wide)).toBe(wide);
			// Every slot has to be written: an omitted one is the shorthand's own
			// default, not what the longhand was left at.
			const partial = "a{flex-grow:1;flex-basis:auto}";
			expect(minify(partial)).toBe(partial);
			// They have to agree on `!important`.
			const important =
				"a{flex-grow:1;flex-shrink:1!important;flex-basis:auto}";
			expect(minify(important)).toBe(important);
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
				// A system color matches ASCII case-insensitively and is what the CSSOM
				// hands back lowercase, so it prints the one way it matches.
			).toBe("a{text-decoration:line-through double canvastext from-font}");
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
	it("adds the prefix a browser below the unprefixed version needs", () => {
		expect(minifyFor("a{user-select:none}", ["chrome 40"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("adds `-moz-` for Firefox and `-ms-` for IE from their own engine", () => {
		expect(minifyFor("a{user-select:none}", ["firefox 40"])).toBe(
			"a{-moz-user-select:none;user-select:none}"
		);
		expect(minifyFor("a{user-select:none}", ["ie 11"])).toBe(
			"a{-ms-user-select:none;user-select:none}"
		);
	});

	it("adds every prefix the mixed selection needs, once each", () => {
		expect(minifyFor("a{user-select:none}", ["chrome 40", "firefox 40"])).toBe(
			"a{-webkit-user-select:none;-moz-user-select:none;user-select:none}"
		);
	});

	it("leaves a declaration alone when the target reads it unprefixed", () => {
		expect(minifyFor("a{user-select:none}", ["chrome 120"])).toBe(
			"a{user-select:none}"
		);
	});

	it("never doubles a prefix the source already carries", () => {
		expect(
			minifyFor("a{-webkit-user-select:none;user-select:none}", ["chrome 40"])
		).toBe("a{-webkit-user-select:none;user-select:none}");
	});

	it("drops a prefixed declaration no target needs, unprefixed sibling present", () => {
		expect(
			minifyFor("a{-webkit-user-select:none;user-select:none}", ["chrome 120"])
		).toBe("a{user-select:none}");
	});

	it("keeps a prefix a target still needs (Safari never unprefixed it)", () => {
		expect(
			minifyFor("a{-webkit-user-select:none;user-select:none}", ["safari 17"])
		).toBe("a{-webkit-user-select:none;user-select:none}");
	});

	it("keeps a prefixed-only declaration — it is the only thing that paints", () => {
		expect(minifyFor("a{-webkit-user-select:none}", ["chrome 120"])).toBe(
			"a{-webkit-user-select:none}"
		);
	});

	it("never carries an obsolete cross-engine prefix (`-khtml-` for Safari)", () => {
		expect(minifyFor("a{user-select:none}", ["safari 17"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minifyFor("a{user-select:none}")).toBe("a{user-select:none}");
	});

	it("does nothing for a property no browser ever prefixed", () => {
		expect(minifyFor("a{color:red}", ["chrome 40"])).toBe("a{color:red}");
	});

	it("drops another engine's prefix a chrome-only target never reads", () => {
		expect(
			minifyFor("a{-moz-user-select:none;user-select:none}", ["chrome 120"])
		).toBe("a{user-select:none}");
	});

	it("reads a browser version's minor part, not just the major", () => {
		// `appearance` loses its prefix in Safari at 15.4; 15.3 still needs `-webkit-`.
		expect(minifyFor("a{appearance:none}", ["safari 15.3"])).toBe(
			"a{-webkit-appearance:none;appearance:none}"
		);
		expect(minifyFor("a{appearance:none}", ["safari 15.4"])).toBe(
			"a{appearance:none}"
		);
	});

	it("reads a version range by its low end", () => {
		expect(minifyFor("a{appearance:none}", ["ios_saf 15.2-15.3"])).toBe(
			"a{-webkit-appearance:none;appearance:none}"
		);
	});

	it("prefixes a shorthand the box merge wrote onto a longhand's node", () => {
		expect(
			minifyFor(
				"a{border-top-left-radius:5px;border-top-right-radius:5px;border-bottom-right-radius:5px;border-bottom-left-radius:5px}",
				["firefox 3.6"]
			)
		).toBe("a{-moz-border-radius:5px;border-radius:5px}");
	});

	it("treats Safari Technology Preview as newest but still finitely versioned", () => {
		expect(minifyFor("a{user-select:none}", ["safari TP"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("adds the prefix on both of two rules using it (decision memoized)", () => {
		expect(
			minifyFor("a{user-select:none}b{user-select:auto}", ["chrome 40"])
		).toBe(
			"a{-webkit-user-select:none;user-select:none}b{-webkit-user-select:auto;user-select:auto}"
		);
	});

	it("keeps prefixing correct through a nested rule", () => {
		expect(minifyFor("@media screen{a{user-select:none}}", ["chrome 40"])).toBe(
			"@media screen{a{-webkit-user-select:none;user-select:none}}"
		);
	});

	it("writes the vendor rename an engine read instead of a prefix", () => {
		expect(
			minifyFor("a{margin-inline-start:1px;padding-inline-end:2px}", [
				"chrome 40",
				"firefox 40"
			])
		).toBe(
			"a{-webkit-margin-start:1px;-moz-margin-start:1px;margin-inline-start:1px;-webkit-padding-end:2px;-moz-padding-end:2px;padding-inline-end:2px}"
		);
		expect(minifyFor("a{block-size:1px}", ["chrome 40"])).toBe(
			"a{-webkit-logical-height:1px;block-size:1px}"
		);
		expect(minifyFor("a{mask-border:url(x) 30}", ["safari 9"])).toBe(
			"a{-webkit-mask-box-image:url(x)30;mask-border:url(x)30}"
		);
	});

	it("writes IE 10's flexbox renames, which take the same values", () => {
		// Two of the three, so they stay longhands: all three merge into `flex`,
		// which the same table renames to `-ms-flex`.
		expect(
			minifyFor("a{order:1;flex-grow:2;flex-basis:4px;flex-wrap:nowrap}", [
				"ie 10"
			])
		).toBe(
			"a{-ms-flex-order:1;order:1;-ms-flex-positive:2;flex-grow:2;-ms-flex-preferred-size:4px;flex-basis:4px;-ms-flex-wrap:nowrap;flex-wrap:nowrap}"
		);
		expect(
			minifyFor("a{flex-grow:2;flex-shrink:3;flex-basis:4px}", ["ie 10"])
		).toBe("a{-ms-flex:2 3 4px;flex:2 3 4px}");
	});

	it("carries the keywords a rename read in place of the standard ones", () => {
		expect(
			minifyFor(
				"a{align-items:flex-start;align-self:flex-end;justify-content:space-around;align-content:space-between}",
				["ie 10"]
			)
		).toBe(
			"a{-ms-flex-align:start;align-items:flex-start;-ms-flex-item-align:end;align-self:flex-end;-ms-flex-pack:distribute;justify-content:space-around;-ms-flex-line-pack:justify;align-content:space-between}"
		);
	});

	it("keeps `!important` on the copy a keyword map rewrote", () => {
		expect(minifyFor("a{align-items:center!important}", ["ie 10"])).toBe(
			"a{-ms-flex-align:center!important;align-items:center!important}"
		);
	});

	it("writes no copy for a value the renamed property cannot read", () => {
		expect(minifyFor("a{align-items:normal}", ["ie 10"])).toBe(
			"a{align-items:normal}"
		);
		expect(minifyFor("a{justify-content:var(--x)}", ["ie 10"])).toBe(
			"a{justify-content:var(--x)}"
		);
	});

	it("carries a CSS-wide keyword through a keyword map untouched", () => {
		expect(minifyFor("a{align-items:inherit}", ["ie 10"])).toBe(
			"a{-ms-flex-align:inherit;align-items:inherit}"
		);
		expect(minifyFor("a{justify-content:unset!important}", ["ie 10"])).toBe(
			"a{-ms-flex-pack:unset!important;justify-content:unset!important}"
		);
	});

	it("reaches for another engine's prefix where a browser has none of its own", () => {
		// Firefox reads `-webkit-line-clamp` and no `line-clamp` of any spelling, so
		// `-moz-` alone would leave it unprefixed — and drop the one that works.
		expect(minifyFor("a{line-clamp:2}", ["firefox 130"])).toBe(
			"a{-webkit-line-clamp:2;line-clamp:2}"
		);
		expect(
			minifyFor("a{-webkit-line-clamp:2;line-clamp:2}", ["firefox 130"])
		).toBe("a{-webkit-line-clamp:2;line-clamp:2}");
		// Before Firefox read it at all, there is nothing to write.
		expect(minifyFor("a{line-clamp:2}", ["firefox 67"])).toBe(
			"a{line-clamp:2}"
		);
	});

	it("keeps to a browser's own prefix where that covers it", () => {
		// Firefox 49 took `-webkit-user-select` as well, but `-moz-user-select`
		// already covers every version it needs, so the alias is not written.
		expect(minifyFor("a{user-select:none}", ["firefox 50"])).toBe(
			"a{-moz-user-select:none;user-select:none}"
		);
	});

	it("drops a dead rename, which no prefix can be stripped off", () => {
		expect(
			minifyFor("a{-webkit-margin-start:1px;margin-inline-start:1px}", [
				"chrome 130"
			])
		).toBe("a{margin-inline-start:1px}");
		expect(
			minifyFor("a{-ms-flex-align:start;align-items:flex-start}", [
				"chrome 130"
			])
		).toBe("a{align-items:flex-start}");
	});

	it("writes no rename that reads other values than the property it stands for", () => {
		expect(
			minifyFor("a{font-smooth:always}", [
				"chrome 40",
				"firefox 40",
				"safari 9"
			])
		).toBe("a{font-smooth:always}");
		expect(
			minifyFor("a{text-combine-upright:all}", ["ie 11", "safari 9"])
		).toBe("a{-ms-text-combine-horizontal:all;text-combine-upright:all}");
	});
});

describe("CssSyntax minify — vendor prefixes (values)", () => {
	it("adds the spellings a target needs for a keyword value", () => {
		expect(minifyFor("a{width:max-content}", ["chrome 40", "firefox 40"])).toBe(
			"a{width:-moz-max-content;width:-webkit-max-content;width:max-content}"
		);
	});

	it("spells a value an engine renamed rather than prefixed", () => {
		expect(minifyFor("a{display:flex}", ["ie 10"])).toBe(
			"a{display:-ms-flexbox;display:flex}"
		);
	});

	it("carries `!important` onto the copy", () => {
		expect(minifyFor("a{position:sticky!important}", ["safari 9"])).toBe(
			"a{position:-webkit-sticky!important;position:sticky!important}"
		);
	});

	it("drops a value spelling no target needs", () => {
		expect(
			minifyFor("a{display:-ms-flexbox;display:flex}", ["chrome 130"])
		).toBe("a{display:flex}");
	});

	it("keeps one a target still needs", () => {
		expect(minifyFor("a{display:-ms-flexbox;display:flex}", ["ie 10"])).toBe(
			"a{display:-ms-flexbox;display:flex}"
		);
	});

	it("keeps a lone value spelling — nothing else writes the property", () => {
		expect(minifyFor("a{display:-ms-flexbox}", ["chrome 130"])).toBe(
			"a{display:-ms-flexbox}"
		);
	});

	it("does not double a spelling the source already carries", () => {
		expect(
			minifyFor("a{width:-webkit-max-content;width:max-content}", ["chrome 40"])
		).toBe("a{width:-webkit-max-content;width:max-content}");
	});

	it("leaves a value that is not the keyword alone", () => {
		expect(minifyFor("a{width:calc(1px + 1em)}", ["chrome 40"])).toBe(
			"a{width:calc(1px + 1em)}"
		);
	});

	it("carries a spelling across the properties of one value grammar", () => {
		// BCD files `-webkit-max-content` under `width` and not under `height`,
		// which is the same value read by the same parser — as `block-size` is
		// `<'width'>` itself.
		expect(minifyFor("a{height:max-content}", ["chrome 40"])).toBe(
			"a{height:-webkit-max-content;height:max-content}"
		);
		expect(minifyFor("a{block-size:max-content}", ["firefox 50"])).toBe(
			"a{block-size:-moz-max-content;block-size:max-content}"
		);
	});

	it("does not take a spelling that stands for another keyword", () => {
		// `-webkit-fill-available` is WebKit's `stretch`, which BCD files under
		// `fit-content` as well; it would fill the container rather than shrink.
		expect(minifyFor("a{width:fit-content}", ["chrome 40"])).toBe(
			"a{width:-webkit-fit-content;width:fit-content}"
		);
	});

	it("leaves a keyword of a property no engine spelled its own way", () => {
		expect(minifyFor("a{float:left}", ["chrome 40"])).toBe("a{float:left}");
	});

	it("keeps a vendor spelling that outlived its window and changed meaning", () => {
		// A current Blink parses `center` and `-webkit-center` both and computes
		// them differently — `-webkit-center` centers block-level children. Taking
		// one for the other moves the box, so neither is written for the other.
		const target = ["chrome 130", "firefox 130", "safari 18"];
		expect(
			minifyFor("a{text-align:center;text-align:-webkit-center}", target)
		).toBe("a{text-align:center;text-align:-webkit-center}");
		expect(
			minifyFor("a{text-align:-webkit-center;text-align:center}", target)
		).toBe("a{text-align:-webkit-center;text-align:center}");
		expect(minifyFor("a{text-align:center}", target)).toBe(
			"a{text-align:center}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minifyFor("a{width:max-content}")).toBe("a{width:max-content}");
	});
});

describe("CssSyntax minify — vendor prefixes (spellings an engine dropped)", () => {
	it("stops at the version the engine dropped the spelling, not at the unprefixed one", () => {
		// `-moz-outline` went in Firefox 3.6; the property it stood for is filed as
		// complete only from 88, which is not where the spelling stopped working.
		expect(minifyFor("a{outline:none}", ["firefox 40"])).toBe(
			"a{outline:none}"
		);
		expect(minifyFor("a{outline:none}", ["firefox 3"])).toBe(
			"a{-moz-outline:none;outline:none}"
		);
	});

	it("carries a prefix BCD does not record but the engine read", () => {
		// Multi-column went unprefixed together — Chrome 50, Firefox 52, Safari 9 —
		// and BCD dates `-webkit-columns` at the version the unprefixed form
		// arrived, 46 versions after Chrome first read it.
		expect(minifyFor("a{column-gap:10px}", ["chrome 40"])).toBe(
			"a{-webkit-column-gap:10px;column-gap:10px}"
		);
		expect(minifyFor("a{columns:2}", ["chrome 40"])).toBe(
			"a{-webkit-columns:2;columns:2}"
		);
		expect(minifyFor("a{column-gap:10px;columns:2}", ["chrome 130"])).toBe(
			"a{column-gap:10px;columns:2}"
		);
	});

	it("drops a prefix an engine switch took away", () => {
		// Presto read `-o-transform`; the Blink Opera that followed at 15 never did.
		expect(minifyFor("a{transform:none}", ["opera 20"])).toBe(
			"a{-webkit-transform:none;transform:none}"
		);
		expect(minifyFor("a{transform:none}", ["opera 12.1"])).toBe(
			"a{-o-transform:none;transform:none}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (at-rules)", () => {
	it("prepends a prefixed copy an old target needs", () => {
		expect(minifyFor("@keyframes s{to{opacity:1}}", ["chrome 40"])).toBe(
			"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}"
		);
	});

	it("leaves it alone when the target reads it unprefixed", () => {
		expect(minifyFor("@keyframes s{to{opacity:1}}", ["chrome 120"])).toBe(
			"@keyframes s{to{opacity:1}}"
		);
	});

	it("does not double a prefixed copy the source already has", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}",
				["chrome 40"]
			)
		).toBe("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}");
	});

	it("drops a prefixed at-rule no target needs after its unprefixed twin", () => {
		expect(
			minifyFor(
				"@keyframes s{to{opacity:1}}@-webkit-keyframes s{to{opacity:1}}",
				["chrome 120"]
			)
		).toBe("@keyframes s{to{opacity:1}}");
	});

	it("drops it from behind a rule held back for a join", () => {
		expect(
			minifyFor(
				"i{top:0}@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}",
				["chrome 120"]
			)
		).toBe("i{top:0}@keyframes s{to{opacity:1}}");
	});

	it("pairs a cased `@Keyframes` with its prefixed twin (case-insensitive)", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}@Keyframes s{to{opacity:1}}",
				["chrome 40"]
			)
		).toBe("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}");
	});

	it("gives each same-named at-rule its own copy, so the last still wins", () => {
		expect(
			minifyFor("@keyframes s{to{opacity:1}}@keyframes s{to{opacity:.5}}", [
				"chrome 40"
			])
		).toBe(
			"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}@-webkit-keyframes s{to{opacity:.5}}@keyframes s{to{opacity:.5}}"
		);
	});

	it("prefixes a nested at-rule against its own scope", () => {
		expect(
			minifyFor("@media screen{@keyframes s{to{opacity:1}}}", ["chrome 40"])
		).toBe(
			"@media screen{@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}}"
		);
	});

	it("does not suppress a scoped copy from a top-level prefixed rule", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}@media screen{@keyframes s{to{opacity:.3}}}",
				["chrome 40"]
			)
		).toBe(
			"@-webkit-keyframes s{to{opacity:1}}@media screen{@-webkit-keyframes s{to{opacity:.3}}@keyframes s{to{opacity:.3}}}"
		);
	});

	it("pairs a nested prefixed rule with the twin in its own scope", () => {
		expect(
			minifyFor(
				"@media screen{@keyframes s{to{opacity:1}}@-webkit-keyframes s{to{opacity:1}}}",
				["chrome 130"]
			)
		).toBe("@media screen{@keyframes s{to{opacity:1}}}");
	});

	it("drops a nested prefixed rule its twin follows", () => {
		expect(
			minifyFor(
				"@media screen{@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}}",
				["chrome 130"]
			)
		).toBe("@media screen{@keyframes s{to{opacity:1}}}");
	});

	it("drops a nested prefixed rule whatever stands between it and its twin", () => {
		expect(
			minifyFor(
				"@media screen{@-webkit-keyframes s{to{opacity:1}}a{color:red}@keyframes s{to{opacity:1}}}",
				["chrome 130"]
			)
		).toBe("@media screen{a{color:red}@keyframes s{to{opacity:1}}}");
	});

	it("keeps a nested prefixed rule whose twin sits in another block", () => {
		expect(
			minifyFor(
				"@media screen{@-webkit-keyframes s{to{opacity:1}}}@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe(
			"@media screen{@-webkit-keyframes s{to{opacity:1}}}@keyframes s{to{opacity:1}}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minifyFor("@keyframes s{to{opacity:1}}")).toBe(
			"@keyframes s{to{opacity:1}}"
		);
	});
});

describe("CssSyntax — a string the source never closed", () => {
	/**
	 * @param {string} source css
	 * @returns {string[]} every string token's value
	 */
	const values = (source) => {
		/** @type {string[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.String]: {
					enter: (/** @type {import("../lib/css/syntax").CssPath} */ path) =>
						seen.push(path.unescaped())
				}
			})
			.process(source);
		return seen;
	};

	// §4.3.5 returns the string token at end of input as well, and that one has no
	// closing quote to take off — taking one off ate a character of the value.
	it.each([
		["a closing quote", "a{b:'xy'}", ["xy"]],
		["end of input", "a{b:'xy", ["xy"]],
		["end of input, holding a brace", "a{b:'xy}", ["xy}"]],
		["end of input, holding only one", "a{b:'}", ["}"]],
		["end of input, holding nothing", "a{b:'", [""]],
		["a double quote at end of input", 'a{b:"d', ["d"]],
		["an empty string", "a{b:''}", [""]],
		["a quote the source escaped", "a{b:'a\\''}", ["a'"]],
		["one escaped at end of input", "a{b:'a\\'", ["a'"]],
		["a backslash the source escaped", "a{b:'a\\\\'}", ["a\\"]],
		["two of them", "a{b:'x' 'y'}", ["x", "y"]]
	])("reads one ended by %s", (_name, source, expected) => {
		expect(values(source)).toEqual(expected);
	});
});

describe("CssSyntax minify — vendor prefixes (selectors)", () => {
	it("prepends the engine spelling a target needs, keeping the source colons", () => {
		expect(minifyFor("::placeholder{color:red}", ["chrome 40"])).toBe(
			"::-webkit-input-placeholder{color:red}::placeholder{color:red}"
		);
	});

	it("prefixes a pseudo behind a compound selector", () => {
		expect(minifyFor("input::placeholder{color:red}", ["chrome 40"])).toBe(
			"input::-webkit-input-placeholder{color:red}input::placeholder{color:red}"
		);
	});

	it("adds `-moz-` for `::selection` on Firefox", () => {
		expect(minifyFor("::selection{color:red}", ["firefox 40"])).toBe(
			"::-moz-selection{color:red}::selection{color:red}"
		);
	});

	it("leaves a pseudo alone when the target reads it unprefixed", () => {
		expect(minifyFor("::placeholder{color:red}", ["chrome 120"])).toBe(
			"::placeholder{color:red}"
		);
	});

	it("drops a prefixed pseudo no target needs after its unprefixed twin", () => {
		expect(
			minifyFor(
				"::placeholder{color:red}::-webkit-input-placeholder{color:red}",
				["chrome 120"]
			)
		).toBe("::placeholder{color:red}");
	});

	it("copies only the selectors of a list that carry the pseudo", () => {
		expect(minifyFor(".a::placeholder,.b{color:red}", ["chrome 40"])).toBe(
			".a::-webkit-input-placeholder{color:red}.a::placeholder,.b{color:red}"
		);
	});

	it("keeps a copy's own list together, one spelling at a time", () => {
		expect(
			minifyFor("input::placeholder,textarea::placeholder{color:red}", [
				"chrome 40",
				"firefox 40"
			])
		).toBe(
			"input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:red}input::-moz-placeholder,textarea::-moz-placeholder{color:red}input::placeholder,textarea::placeholder{color:red}"
		);
	});

	it("splits a copy whose selectors take different spellings", () => {
		// `::-webkit-input-placeholder` is Chrome 6 and `:-webkit-full-screen` is
		// Chrome 15: a list of the two is nothing at all to Chrome 6 through 14,
		// which drops a list whole over one selector it cannot parse.
		expect(
			minifyFor("input::placeholder,:fullscreen{color:red}", ["chrome 40"])
		).toBe(
			"input::-webkit-input-placeholder{color:red}:-webkit-full-screen{color:red}:fullscreen,input::placeholder{color:red}"
		);
	});

	it("drops a prefixed list its unprefixed twin follows", () => {
		expect(
			minifyFor(
				"input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:red}input::placeholder,textarea::placeholder{color:red}",
				["chrome 130"]
			)
		).toBe("input::placeholder,textarea::placeholder{color:red}");
	});

	it("leaves a list mixing two engines' spellings alone", () => {
		expect(
			minifyFor(
				"input::-webkit-input-placeholder,textarea::-moz-placeholder{color:red}",
				["chrome 130"]
			)
		).toBe(
			"input::-webkit-input-placeholder,textarea::-moz-placeholder{color:red}"
		);
	});

	it("gives each same-pseudo rule its own copy, so the last still wins", () => {
		expect(
			minifyFor("::placeholder{color:red}::placeholder{color:blue}", [
				"chrome 40"
			])
		).toBe(
			"::-webkit-input-placeholder{color:red}::placeholder{color:red}::-webkit-input-placeholder{color:blue}::placeholder{color:blue}"
		);
	});

	it("matches a pseudo name case-insensitively", () => {
		expect(minifyFor("::PLACEHOLDER{color:red}", ["chrome 40"])).toBe(
			"::-webkit-input-placeholder{color:red}::placeholder{color:red}"
		);
	});

	it("prefixes a functional pseudo, carrying its argument", () => {
		expect(minifyFor(":dir(rtl){color:red}", ["firefox 40"])).toBe(
			":-moz-dir(rtl){color:red}:dir(rtl){color:red}"
		);
	});

	it("keeps two functional pseudos with different arguments distinct", () => {
		expect(
			minifyFor(":dir(rtl){color:red}:dir(ltr){color:blue}", ["firefox 40"])
		).toBe(
			":-moz-dir(rtl){color:red}:dir(rtl){color:red}:-moz-dir(ltr){color:blue}:dir(ltr){color:blue}"
		);
	});

	it("leaves a pseudo inside a functional selector untouched", () => {
		expect(minifyFor(":not(:autofill){color:red}", ["chrome 40"])).toBe(
			":not(:autofill){color:red}"
		);
	});

	it("spells a pseudo its engines renamed rather than prefixed", () => {
		expect(
			minifyFor(":is(a,b) c{color:red}", ["chrome 40", "firefox 40"])
		).toBe(
			":-webkit-any(a,b) c{color:red}:-moz-any(a,b) c{color:red}:is(a,b) c{color:red}"
		);
	});

	it("drops a renamed pseudo no target needs", () => {
		expect(
			minifyFor(":-webkit-any(a,b){color:red}:is(a,b){color:red}", [
				"chrome 130"
			])
		).toBe(":is(a,b){color:red}");
	});

	it("spells `:fullscreen` for each engine that renamed it", () => {
		expect(
			minifyFor(":fullscreen{color:red}", ["chrome 40", "firefox 40"])
		).toBe(
			":-webkit-full-screen{color:red}:-moz-full-screen{color:red}:fullscreen{color:red}"
		);
	});

	it("prefixes a nested rule against its own scope", () => {
		expect(
			minifyFor("@media screen{::placeholder{color:red}}", ["chrome 40"])
		).toBe(
			"@media screen{::-webkit-input-placeholder{color:red}::placeholder{color:red}}"
		);
	});

	it("prefixes a rule nested under another", () => {
		expect(minifyFor("a{&::placeholder{color:red}}", ["chrome 40"])).toBe(
			"a{&::-webkit-input-placeholder{color:red}&::placeholder{color:red}}"
		);
	});

	it("drops a nested prefixed rule its twin follows", () => {
		expect(
			minifyFor(
				"@media screen{::-webkit-input-placeholder{color:red}::placeholder{color:red}}",
				["chrome 130"]
			)
		).toBe("@media screen{::placeholder{color:red}}");
	});

	it("drops a nested prefixed rule whatever stands between it and its twin", () => {
		expect(
			minifyFor(
				"@media screen{::-webkit-input-placeholder{color:red}a{color:red}::placeholder{color:red}}",
				["chrome 130"]
			)
		).toBe("@media screen{a{color:red}::placeholder{color:red}}");
	});

	it("keeps a nested prefixed rule a target still needs beside its twin, unjoined", () => {
		expect(
			minifyFor(
				"@media screen{::-webkit-input-placeholder{color:red}::placeholder{color:red}}",
				["chrome 40"]
			)
		).toBe(
			"@media screen{::-webkit-input-placeholder{color:red}::placeholder{color:red}}"
		);
	});

	it("does nothing without a target list", () => {
		expect(minifyFor("::placeholder{color:red}")).toBe(
			"::placeholder{color:red}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (target selection)", () => {
	it("reads IE Mobile through IE's windows — the same engine on the same version line", () => {
		expect(
			minifyFor("a{-ms-user-select:none;user-select:none}", [
				"chrome 130",
				"ie_mob 11"
			])
		).toBe("a{-ms-user-select:none;user-select:none}");
	});

	it("reads IE Mobile apart from IE where the two shipped different features", () => {
		// `text-size-adjust` is prefixed on IE Mobile and absent from desktop IE,
		// which BCD cannot say because it does not track IE Mobile at all.
		expect(minifyFor("a{text-size-adjust:100%}", ["ie_mob 11"])).toBe(
			"a{-ms-text-size-adjust:100%;text-size-adjust:100%}"
		);
		expect(minifyFor("a{text-size-adjust:100%}", ["ie 11"])).toBe(
			"a{text-size-adjust:100%}"
		);
		expect(
			minifyFor("a{-ms-text-size-adjust:100%;text-size-adjust:100%}", [
				"ie_mob 11"
			])
		).toBe("a{-ms-text-size-adjust:100%;text-size-adjust:100%}");
		expect(
			minifyFor("a{-ms-text-size-adjust:100%;text-size-adjust:100%}", ["ie 11"])
		).toBe("a{text-size-adjust:100%}");
	});

	it("holds a WebKit prefix to the later of two dated boundaries", () => {
		// caniuse dates unprefixed `font-kerning` a release after BCD on desktop and
		// three years after it on iOS; the feature is this one property, so the gap
		// is a disagreement rather than a wider feature.
		expect(minifyFor("a{font-kerning:normal}", ["safari 9"])).toBe(
			"a{-webkit-font-kerning:normal;font-kerning:normal}"
		);
		expect(minifyFor("a{font-kerning:normal}", ["safari 9.1"])).toBe(
			"a{font-kerning:normal}"
		);
		expect(minifyFor("a{font-kerning:normal}", ["ios_saf 11.3"])).toBe(
			"a{-webkit-font-kerning:normal;font-kerning:normal}"
		);
		expect(minifyFor("a{font-kerning:normal}", ["ios_saf 12.0"])).toBe(
			"a{font-kerning:normal}"
		);
		expect(
			minifyFor("a{-webkit-font-kerning:normal;font-kerning:normal}", [
				"safari 18"
			])
		).toBe("a{font-kerning:normal}");
	});

	it("reads IE Mobile through the same Trident as desktop IE", () => {
		// IE Mobile 10 is Trident 6, so it needs the 2012 flexbox renames exactly as
		// IE 10 does; 11 is Trident 7 and needs none of them.
		expect(minifyFor("a{order:1;align-items:center}", ["ie_mob 10"])).toBe(
			"a{-ms-flex-order:1;order:1;-ms-flex-align:center;align-items:center}"
		);
		expect(minifyFor("a{order:1;align-items:center}", ["ie_mob 11"])).toBe(
			"a{order:1;align-items:center}"
		);
		expect(minifyFor("a{-ms-flex-order:1;order:1}", ["ie_mob 10"])).toBe(
			"a{-ms-flex-order:1;order:1}"
		);
	});

	it("keeps Presto prefixed where caniuse tracks it version by version", () => {
		// BCD dates Opera's unprefixed `border-image` at 11; caniuse, which is the
		// only dataset following Presto version by version, marks every version
		// that has it at all as needing the prefix.
		expect(minifyFor("a{border-image:url(x) 30}", ["opera 12.1"])).toBe(
			"a{-o-border-image:url(x)30;border-image:url(x)30}"
		);
		expect(
			minifyFor("a{-o-border-image:url(x)30;border-image:url(x)30}", [
				"opera 12.1"
			])
		).toBe("a{-o-border-image:url(x)30;border-image:url(x)30}");
		// Opera Mobile kept `text-overflow` prefixed four versions past desktop.
		expect(minifyFor("a{text-overflow:ellipsis}", ["op_mob 12"])).toBe(
			"a{-o-text-overflow:ellipsis;text-overflow:ellipsis}"
		);
		expect(minifyFor("a{text-overflow:ellipsis}", ["op_mob 12.1"])).toBe(
			"a{text-overflow:ellipsis}"
		);
		expect(minifyFor("a{text-overflow:ellipsis}", ["opera 11"])).toBe(
			"a{text-overflow:ellipsis}"
		);
		// Presto shipped `object-fit` as its own extension a year before BCD dates
		// the prefixed form, and `background-size` went plain at 10.5, not at 10.
		expect(minifyFor("a{object-fit:cover}", ["opera 10.6"])).toBe(
			"a{-o-object-fit:cover;object-fit:cover}"
		);
		expect(minifyFor("a{object-fit:cover}", ["opera 10.5"])).toBe(
			"a{object-fit:cover}"
		);
		expect(minifyFor("a{background-size:cover}", ["opera 10.0-10.1"])).toBe(
			"a{-o-background-size:cover;background-size:cover}"
		);
		expect(minifyFor("a{background-size:cover}", ["opera 10.5"])).toBe(
			"a{background-size:cover}"
		);
	});

	it("writes the spelling Gecko parses where BCD records only whether it has an effect", () => {
		// Gecko carries `-moz-text-size-adjust` as a real longhand and no
		// unprefixed spelling at all, so a Firefox target losing the `-moz-` one is
		// left with a declaration it cannot parse. BCD calls desktop Firefox
		// unsupported, which is about effect rather than about parsing.
		expect(minifyFor("a{text-size-adjust:none}", ["firefox 130"])).toBe(
			"a{-moz-text-size-adjust:none;text-size-adjust:none}"
		);
		expect(
			minifyFor("a{-moz-text-size-adjust:none;text-size-adjust:none}", [
				"firefox 130"
			])
		).toBe("a{-moz-text-size-adjust:none;text-size-adjust:none}");
		// Before Gecko carried it, there is nothing to write.
		expect(minifyFor("a{text-size-adjust:none}", ["firefox 13"])).toBe(
			"a{text-size-adjust:none}"
		);
	});

	it("writes both spellings for old Edge, which the two datasets disagree over", () => {
		// BCD records `-webkit-` for the feature; caniuse marks the version prefixed
		// and resolves the name from a browser-wide `-ms-` default, which is what
		// autoprefixer and lightningcss write. Neither says why, so both go out.
		expect(minifyFor("a{text-size-adjust:100%}", ["edge 15"])).toBe(
			"a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;text-size-adjust:100%}"
		);
		// Chromium-era Edge reads the unprefixed one, so neither is written.
		expect(minifyFor("a{text-size-adjust:100%}", ["edge 79"])).toBe(
			"a{text-size-adjust:100%}"
		);
		// And a source carrying the `-ms-` one loses it once no target needs it.
		expect(
			minifyFor("a{-ms-text-size-adjust:100%;text-size-adjust:100%}", [
				"edge 79"
			])
		).toBe("a{text-size-adjust:100%}");
	});

	it("skips a browser no dataset covers, as lightningcss's target mapping does", () => {
		expect(
			minifyFor("a{-webkit-border-radius:5px;border-radius:5px}", [
				"chrome 130",
				"bb 10"
			])
		).toBe("a{border-radius:5px}");
	});

	it("still adds for the browsers it does resolve", () => {
		expect(minifyFor("a{user-select:none}", ["chrome 40", "op_mini all"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("leaves prefixes alone when nothing in the selection resolves", () => {
		expect(
			minifyFor("a{-webkit-border-radius:5px;border-radius:5px}", [
				"op_mini all",
				"chrome"
			])
		).toBe("a{-webkit-border-radius:5px;border-radius:5px}");
	});

	it("leaves prefixes alone for an empty selection", () => {
		expect(
			minifyFor("a{-webkit-border-radius:5px;border-radius:5px}", [])
		).toBe("a{-webkit-border-radius:5px;border-radius:5px}");
	});

	it("reads every selected version of one browser, not just the oldest", () => {
		// Chrome 130 is past `user-select`'s unprefixed arrival and 40 is inside its
		// prefix window: an interval is not answered by the selection's low end.
		expect(minifyFor("a{user-select:none}", ["chrome 130", "chrome 40"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});

	it("takes the low end of a version range", () => {
		expect(minifyFor("a{user-select:none}", ["ios_saf 15.0-15.1"])).toBe(
			"a{-webkit-user-select:none;user-select:none}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (joined rules)", () => {
	it("keeps the prefixes it added when two at-rules join", () => {
		expect(
			minifyFor(
				"@media screen{a{user-select:none}}@media screen{b{color:red}}",
				["chrome 40"]
			)
		).toBe(
			"@media screen{a{-webkit-user-select:none;user-select:none}b{color:red}}"
		);
	});

	it("does not bring back a prefix it dropped when two at-rules join", () => {
		expect(
			minifyFor(
				"@media screen{a{-webkit-border-radius:5px;border-radius:5px}}@media screen{b{color:red}}",
				["chrome 130"]
			)
		).toBe("@media screen{a{border-radius:5px}b{color:red}}");
	});

	it("joins the rules inside two blocks with their own prefixes", () => {
		expect(
			minifyFor(
				"@media screen{a{user-select:none}}@media screen{b{color:red}}",
				["chrome 40"]
			)
		).toBe(
			"@media screen{a{-webkit-user-select:none;user-select:none}b{color:red}}"
		);
	});
});

describe("CssSyntax minify — vendor prefixes (a twin written first)", () => {
	it("drops a prefixed at-rule its unprefixed twin follows", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("@keyframes s{to{opacity:1}}");
	});

	it("drops a prefixed rule its unprefixed twin follows", () => {
		expect(
			minifyFor(
				"::-webkit-input-placeholder{color:red}::placeholder{color:red}",
				["chrome 130"]
			)
		).toBe("::placeholder{color:red}");
	});

	it("keeps it where a target still needs the prefix", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}",
				["chrome 40"]
			)
		).toBe("@-webkit-keyframes s{to{opacity:1}}@keyframes s{to{opacity:1}}");
	});

	it("keeps a prefixed at-rule with no unprefixed twin at all", () => {
		expect(
			minifyFor("@-webkit-keyframes s{to{opacity:1}}", ["chrome 130"])
		).toBe("@-webkit-keyframes s{to{opacity:1}}");
	});

	it("drops one its twin follows from further off", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}a{color:red}@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("a{color:red}@keyframes s{to{opacity:1}}");
	});

	it("drops each of a run of prefixed at-rules its twins follow", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes a{to{opacity:1}}@-webkit-keyframes b{to{opacity:0}}@keyframes a{to{opacity:1}}@keyframes b{to{opacity:0}}",
				["chrome 130"]
			)
		).toBe("@keyframes a{to{opacity:1}}@keyframes b{to{opacity:0}}");
	});

	it("keeps a kept comment that stood between them", () => {
		expect(
			minifyFor(
				"@-webkit-keyframes s{to{opacity:1}}/*! banner */@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("/*! banner */@keyframes s{to{opacity:1}}");
	});

	it("leaves a joined run alone", () => {
		expect(
			minifyFor(
				"@media screen{a{color:red}}@media screen{b{color:red}}@keyframes s{to{opacity:1}}",
				["chrome 130"]
			)
		).toBe("@media screen{a,b{color:red}}@keyframes s{to{opacity:1}}");
	});
});

// The tokenizer's corpus through the other print mode: beautifying had none of
// its own, and it is what a consumer reads, so its output is snapshotted.
describe("CssSyntax — beautifying the parsing corpus", () => {
	const casesPath = path.resolve(__dirname, "./configCases/css/parsing/cases");
	const cases = fs
		.readdirSync(casesPath)
		.filter((name) => name.endsWith(".css"))
		.map((name) => [
			name,
			fs.readFileSync(path.resolve(casesPath, name), "utf8")
		]);

	/**
	 * @param {string} src css source
	 * @param {import("../lib/util/SourceProcessor").PrintOptions["mode"]} mode print mode
	 * @returns {string} its serialization
	 */
	const print = (src, mode) =>
		new SourceProcessor().process(src, { mode }).code;

	it("has a corpus", () => {
		expect(cases.length).toBeGreaterThan(15);
	});

	for (const [name, code] of cases) {
		it(`should beautify "${name}"`, () => {
			const beautified = print(code, "beautify");
			expect(beautified).toMatchSnapshot();
			// The printer has to accept what it wrote: beautifying is a fixed point.
			expect(print(beautified, "beautify")).toBe(beautified);
		});
	}

	// Both modes read the same stylesheet, so minifying either form answers the
	// same — what `print modes` states over a handful, over every case here.
	for (const [name, code] of cases) {
		it(`should minify "${name}" the same from either form`, () => {
			expect(print(print(code, "beautify"), "minify")).toBe(
				print(code, "minify")
			);
		});
	}
});

describe("SourceProcessor — renderEmbeddedSource over a data: url", () => {
	/**
	 * @param {string} sheet the stylesheet
	 * @param {import("../lib/css/syntax").EmbeddedSourceRenderer=} renderEmbeddedSource the renderer
	 * @returns {string} the minified stylesheet
	 */
	const minify = (sheet, renderEmbeddedSource) =>
		new SourceProcessor().process(sheet, {
			mode: "minify",
			renderEmbeddedSource
		}).code;

	/**
	 * @param {string} sheet the stylesheet
	 * @returns {[string, string][]} each payload offered, as `[type, source]`
	 */
	const offered = (sheet) => {
		/** @type {[string, string][]} */
		const seen = [];
		minify(sheet, (source, info) => {
			seen.push([info.type, source]);
			return source;
		});
		return seen;
	};

	const svgUrl =
		'.a{background:url("data:image/svg+xml,<svg>  <rect/></svg>")}';
	const base64Url = `.a{background:url(data:image/svg+xml;base64,${Buffer.from(
		"<svg>  <rect/></svg>"
	).toString("base64")})}`;

	it("offers an svg payload, quoted or base64", () => {
		expect(offered(svgUrl)).toEqual([["svg", "<svg>  <rect/></svg>"]]);
		expect(offered(base64Url)).toEqual([["svg", "<svg>  <rect/></svg>"]]);
	});

	it("names the language its media type carries, and declines an unknown one", () => {
		expect(offered('.a{background:url("data:text/css,a{color:red}")}')).toEqual(
			[["css", "a{color:red}"]]
		);
		expect(
			offered('.a{background:url("data:application/json,{\\"a\\":1}")}')
		).toEqual([["json", '{"a":1}']]);
		// An image webpack has no notion of is never decoded.
		expect(
			offered('.a{background:url("data:image/png;base64,iVBORw0KGgo=")}')
		).toEqual([]);
		expect(offered('.a{background:url("./img.png")}')).toEqual([]);
	});

	it("rebuilds the url in the shortest form that parses back to it", () => {
		// A rebuilt url keeps its base64-ness, and loses quotes it no longer needs.
		expect(minify(svgUrl, (s) => s.replace(/\s+/g, ""))).toBe(
			".a{background:url(data:image/svg+xml,<svg><rect/></svg>)}"
		);
		expect(minify(base64Url, (s) => s.replace(/\s+/g, ""))).toBe(
			`.a{background:url(data:image/svg+xml;base64,${Buffer.from(
				"<svg><rect/></svg>"
			).toString("base64")})}`
		);
	});

	it("escapes only what would change what the url means", () => {
		expect(minify(svgUrl, () => "<svg>%#</svg>")).toBe(
			".a{background:url(data:image/svg+xml,<svg>%25%23</svg>)}"
		);
	});

	it("quotes and escapes a payload a url token cannot carry", () => {
		// A space or a quote would end the token, so the url takes quotes and the
		// delimiter inside it is escaped — otherwise the declaration is dropped.
		expect(minify(svgUrl, () => '<svg viewBox="0 0 2 2"/>')).toBe(
			'.a{background:url("data:image/svg+xml,<svg viewBox=\\"0 0 2 2\\"/>")}'
		);
	});

	it("keeps the stylesheet's own map coherent when the payload changes size", () => {
		// The url goes out as one piece, so the columns after it move with it —
		// rewriting a payload must not shift the mappings that follow.
		const sheet =
			'.a {\n\tcolor : red ;\n}\n.b {\n\tbackground : url("data:image/svg+xml,<svg>    <rect/>    </svg>") ;\n}\n.c {\n\tcolor : blue ;\n}\n';
		/**
		 * @param {import("../lib/css/syntax").EmbeddedSourceRenderer=} renderEmbeddedSource the renderer
		 * @returns {{ code: string, map: EXPECTED_ANY }} the printed sheet and its map
		 */
		const run = (renderEmbeddedSource) =>
			new SourceProcessor().process(sheet, {
				mode: "minify",
				source: "s.css",
				content: sheet,
				renderEmbeddedSource
			});
		const plain = run();
		const shrunk = run((source, info) =>
			info.type === "svg" ? source.replace(/\s+/g, "") : source
		);
		// Eight characters left the payload, and the last mapping's generated
		// column is the only thing that moved — by exactly that much.
		// Eight characters of whitespace, and the two quotes the shorter url no
		// longer needs.
		expect(plain.code.length - shrunk.code.length).toBe(10);
		const columns = (/** @type {string} */ mappings) =>
			mappings.split(",").length;
		expect(columns(shrunk.map.mappings)).toBe(columns(plain.map.mappings));
		expect(shrunk.map.mappings).not.toBe(plain.map.mappings);
	});

	it("emits the url as written when the renderer answers with a non-string", () => {
		const untouched = minify(svgUrl);
		for (const answer of [undefined, null, 42]) {
			expect(minify(svgUrl, () => /** @type {EXPECTED_ANY} */ (answer))).toBe(
				untouched
			);
		}
	});

	it("emits the url as written when the renderer declines or throws", () => {
		for (const sheet of [svgUrl, base64Url]) {
			const untouched = minify(sheet);
			expect(minify(sheet, (s) => s)).toBe(untouched);
			expect(
				minify(sheet, () => {
					throw new Error("nope");
				})
			).toBe(untouched);
		}
	});
});

describe("CssSyntax minify — what a duplicate rule is scoped to", () => {
	const { SourceProcessor } = require("../lib/css/syntax");

	/**
	 * @param {string} css input stylesheet
	 * @returns {string} the minified stylesheet
	 */
	const minify = (css) =>
		new SourceProcessor().process(css, { mode: "minify" }).code;

	it("takes back a rule an identical later one under the same conditions kills", () => {
		expect(
			minify("@media print{.a{color:red}.b{color:#00f}.a{color:red}}")
		).toBe("@media print{.b{color:#00f}.a{color:red}}");
	});

	it("keeps both when the conditions differ", () => {
		expect(
			minify("@media print{.a{color:red}}@media screen{.a{color:red}}")
		).toBe("@media print{.a{color:red}}@media screen{.a{color:red}}");
	});

	it("keeps both when one is nested deeper under the same outer condition", () => {
		expect(
			minify("@media print{@supports (a:b){.a{color:red}}.a{color:red}}")
		).toBe("@media print{@supports (a:b){.a{color:red}}.a{color:red}}");
	});

	it("folds two blocks that say the same thing into one", () => {
		expect(
			minify(
				"@media print{@supports (a:b){.a{color:red}}}" +
					"@media print{@supports (a:b){.a{color:red}}}"
			)
		).toBe("@media print{@supports (a:b){.a{color:red}}}");
	});

	it("does not read a rule as one whose text merely starts the same", () => {
		expect(minify("@media print{.a{color:red}.a{color:redd}}")).toBe(
			"@media print{.a{color:red}.a{color:redd}}"
		);
	});
});

describe("CssSyntax minify — lowering a spelling the target cannot read", () => {
	it("writes a hex alpha as the `rgba()` it names", () => {
		expect(minifyFor("a{color:#7bffff80}", ["chrome 50"])).toBe(
			"a{color:rgba(123,255,255,.5)}"
		);
		// The shortest decimal that quantizes back to the same byte.
		expect(minifyFor("a{color:#7bf8}", ["chrome 50"])).toBe(
			"a{color:rgba(119,187,255,.533)}"
		);
		expect(minifyFor("a{color:#ff000001}", ["chrome 50"])).toBe(
			"a{color:rgba(255,0,0,.004)}"
		);
		// Transparent black is the keyword, which is shorter and older still.
		expect(minifyFor("a{color:#0000}", ["chrome 50"])).toBe(
			"a{color:transparent}"
		);
		// An opaque alpha asks nothing of the target, and a target that reads the
		// notation keeps it.
		expect(minifyFor("a{color:#aabbccff}", ["chrome 50"])).toBe(
			"a{color:#abc}"
		);
		expect(minifyFor("a{color:#7bffff80}", ["chrome 130"])).toBe(
			"a{color:#7bffff80}"
		);
		// A hash is a color only in a value: an id keeps every byte of its name.
		expect(minifyFor("#7bffff80{color:red}", ["chrome 50"])).toBe(
			"#7bffff80{color:red}"
		);
		// A transparent color that is not black is the `rgba()` of its channels.
		expect(minifyFor("a{color:#ff000000}", ["chrome 50"])).toBe(
			"a{color:rgba(255,0,0,0)}"
		);
		// An opaque one is written as the name or hex it already had.
		expect(minifyFor("a{color:#ff0000ff}", ["chrome 50"])).toBe("a{color:red}");
		// A hash that is no hex color at all is left as the token it is.
		expect(minifyFor("a{color:#zzzz}", ["chrome 50"])).toBe("a{color:#zzzz}");
		// And with the color transform off, an opaque alpha still asks nothing of
		// the target — there is nothing to lower.
		expect(
			new SourceProcessor().process("a{color:#aabbccff}", {
				mode: "minify",
				environment: { browsers: ["chrome 50"] },
				transforms: { shortenColors: false }
			}).code
		).toBe("a{color:#aabbccff}");
	});

	it("lowers a hex alpha wherever a color may stand", () => {
		expect(
			minifyFor("a{background:linear-gradient(#0008,#fff)}", ["chrome 50"])
		).toBe("a{background:linear-gradient(rgba(0,0,0,.533),#fff)}");
		expect(minifyFor("a{color:var(--x,#7bffff80)}", ["chrome 50"])).toBe(
			"a{color:var(--x,rgba(123,255,255,.5))}"
		);
		// A custom property's value is handed back as written.
		expect(minifyFor("a{--x:#7bffff80}", ["chrome 50"])).toBe(
			"a{--x:#7bffff80}"
		);
	});

	it("writes a media range as the `min-` / `max-` prefixes", () => {
		expect(
			minifyFor("@media (width>=480px){a{color:red}}", ["chrome 100"])
		).toBe("@media (min-width:480px){a{color:red}}");
		expect(
			minifyFor("@media (width<=480px){a{color:red}}", ["chrome 100"])
		).toBe("@media (max-width:480px){a{color:red}}");
		expect(
			minifyFor("@media (width=480px){a{color:red}}", ["chrome 100"])
		).toBe("@media (width:480px){a{color:red}}");
		expect(
			minifyFor("@media screen and (width>=480px){a{color:red}}", [
				"chrome 100"
			])
		).toBe("@media screen and (min-width:480px){a{color:red}}");
		expect(
			minifyFor("@media (width>=480px),(height<=100px){a{color:red}}", [
				"chrome 100"
			])
		).toBe("@media (min-width:480px),(max-height:100px){a{color:red}}");
		// A target that reads the range spelling is written the shorter one.
		expect(
			minifyFor("@media (min-width:480px){a{color:red}}", ["chrome 130"])
		).toBe("@media (width>=480px){a{color:red}}");
	});

	it("writes a media interval as the two bounds it names", () => {
		expect(
			minifyFor("@media (480px<=width<=768px){a{color:red}}", ["chrome 100"])
		).toBe("@media (min-width:480px) and (max-width:768px){a{color:red}}");
		expect(
			minifyFor("@media (768px>=width>=480px){a{color:red}}", ["chrome 100"])
		).toBe("@media (max-width:768px) and (min-width:480px){a{color:red}}");
		// An `and` inside an `or` needs its own parentheses, which a prelude
		// already holding an `or` is new enough to read.
		expect(
			minifyFor("@media (color) or (480px<=width<=768px){a{color:red}}", [
				"chrome 100"
			])
		).toBe(
			"@media (color) or ((min-width:480px) and (max-width:768px)){a{color:red}}"
		);
	});

	it("leaves a comparison with no `min-` / `max-` equivalent", () => {
		// A strict bound is only `not (max-width:…)`, which is Media Queries 4 as
		// much as the range spelling it would replace.
		expect(
			minifyFor("@media (width>480px){a{color:red}}", ["chrome 100"])
		).toBe("@media (width>480px){a{color:red}}");
		expect(
			minifyFor("@media (480px<=width<768px){a{color:red}}", ["chrome 100"])
		).toBe("@media (480px<=width<768px){a{color:red}}");
		// A `@container` query is itself newer than the range spelling.
		expect(
			minifyFor("@container (width>=480px){a{color:red}}", ["chrome 100"])
		).toBe("@container (width>=480px){a{color:red}}");
		// Two comparisons facing each other bound nothing, so there is no pair to
		// write — Media Queries 4 §2.4.3 gives no such interval.
		expect(
			minifyFor("@media (480px<=width>=768px){a{color:red}}", ["chrome 100"])
		).toBe("@media (480px<=width>=768px){a{color:red}}");
	});

	it("writes a shorthand the target cannot read as its longhands", () => {
		expect(minifyFor("a{place-items:center start}", ["chrome 45"])).toBe(
			"a{align-items:center;justify-items:start}"
		);
		// One value fills both slots.
		expect(minifyFor("a{place-items:center}", ["chrome 45"])).toBe(
			"a{align-items:center;justify-items:center}"
		);
		expect(
			minifyFor("a{place-self:center start!important}", ["chrome 45"])
		).toBe("a{align-self:center!important;justify-self:start!important}");
		expect(minifyFor("a{overflow:hidden auto}", ["chrome 60"])).toBe(
			"a{overflow-x:hidden;overflow-y:auto}"
		);
		expect(minifyFor("a{inset:1px 2px}", ["chrome 80"])).toBe(
			"a{top:1px;right:2px;bottom:1px;left:2px}"
		);
		// The one-value spelling is as old as the property itself.
		expect(minifyFor("a{overflow:hidden}", ["chrome 60"])).toBe(
			"a{overflow:hidden}"
		);
		// A target that reads the shorthand is written it.
		expect(
			minifyFor("a{align-items:center;justify-items:start}", ["chrome 130"])
		).toBe("a{place-items:center start}");
	});

	it("refuses a shorthand whose longhands would not say the same", () => {
		// A substitution may expand across a slot boundary.
		expect(minifyFor("a{place-items:var(--x)}", ["chrome 45"])).toBe(
			"a{place-items:var(--x)}"
		);
		// `left` is a keyword only `justify-items` takes, so the engine drops the
		// whole shorthand — splitting it would revive the half that parses.
		expect(minifyFor("a{place-items:left center}", ["chrome 45"])).toBe(
			"a{place-items:left center}"
		);
	});

	it("writes a two-position color stop as the two stops it names", () => {
		expect(
			minifyFor("a{background:linear-gradient(green,red 30% 40%,pink)}", [
				"chrome 60"
			])
		).toBe("a{background:linear-gradient(green,red 30%,red 40%,pink)}");
		expect(
			minifyFor(
				"a{background:conic-gradient(from 45deg,red 10deg 20deg,blue)}",
				["chrome 60"]
			)
		).toBe("a{background:conic-gradient(from 45deg,red 10deg,red 20deg,blue)}");
		// A gradient's first argument may be its shape and size rather than a stop.
		expect(
			minifyFor("a{background:radial-gradient(ellipse 50% 50%,red,blue)}", [
				"chrome 60"
			])
		).toBe("a{background:radial-gradient(ellipse 50% 50%,red,blue)}");
		// A target that reads the notation is written the shorter one.
		expect(
			minifyFor("a{background:linear-gradient(green,red 30%,red 40%,pink)}", [
				"chrome 130"
			])
		).toBe("a{background:linear-gradient(green,red 30% 40%,pink)}");
	});

	it("writes a multi-keyword `display` as the one keyword naming the same box", () => {
		expect(minifyFor("a{display:inline flex}", ["chrome 100"])).toBe(
			"a{display:inline-flex}"
		);
		expect(minifyFor("a{display:flex inline}", ["chrome 100"])).toBe(
			"a{display:inline-flex}"
		);
		// Nothing names this box in one keyword, so there is nothing to write.
		expect(minifyFor("a{display:block ruby}", ["chrome 100"])).toBe(
			"a{display:block ruby}"
		);
		// Where the one-keyword name is no shorter, a target reading the pair keeps
		// what the author wrote; a shorter one is always written.
		expect(minifyFor("a{display:inline flex}", ["chrome 130"])).toBe(
			"a{display:inline flex}"
		);
		expect(minifyFor("a{display:block flex}", ["chrome 130"])).toBe(
			"a{display:flex}"
		);
	});

	it("leaves every spelling alone with no target to read them", () => {
		expect(minifyFor("a{color:#7bffff80}")).toBe("a{color:#7bffff80}");
		expect(minifyFor("@media (480px<=width<=768px){a{color:red}}")).toBe(
			"@media (480px<=width<=768px){a{color:red}}"
		);
		expect(minifyFor("a{place-items:center start}")).toBe(
			"a{place-items:center start}"
		);
		expect(minifyFor("a{display:inline flex}")).toBe("a{display:inline flex}");
	});
});

describe("CssSyntax minify — a fallback for a color the target cannot read", () => {
	/**
	 * @param {string} css a stylesheet
	 * @param {string[]} browsers the browserslist selection to target
	 * @returns {string} its minified serialization, with the fallback turned off
	 */
	const withoutFallbacks = (css, browsers) =>
		new SourceProcessor().process(css, {
			mode: "minify",
			environment: { browsers },
			transforms: { colorFallbacks: false }
		}).code;

	it("writes the color a Lab-family function names before it", () => {
		expect(minifyFor("a{color:lab(40% 56.6 39)}", ["chrome 100"])).toBe(
			"a{color:#b32323;color:lab(40% 56.6 39)}"
		);
		expect(
			minifyFor("a{color:oklch(59.686% 0.15619 49.7694)}", ["chrome 100"])
		).toBe("a{color:#c65d06;color:oklch(59.686% .15619 49.7694)}");
		// `hwb()` shipped before the Lab family, so it has a target of its own.
		expect(minifyFor("a{color:hwb(194 0% 0%)}", ["chrome 100"])).toBe(
			"a{color:#00c3ff;color:hwb(194 0% 0%)}"
		);
		// A target reading the function is written it alone.
		expect(minifyFor("a{color:lab(40% 56.6 39)}", ["chrome 130"])).toBe(
			"a{color:lab(40% 56.6 39)}"
		);
	});

	it("clips a color sRGB cannot show, which the declaration after it corrects", () => {
		// Replacing the function with this would be a different color; standing
		// before it, it is only ever read where there is no better answer.
		expect(minifyFor("a{color:oklch(0.7 0.4 150)}", ["chrome 100"])).toBe(
			"a{color:#00d600;color:oklch(.7 .4 150)}"
		);
	});

	it("writes an alpha the way the target spells one", () => {
		expect(minifyFor("a{color:lch(70% 40 20 / .5)}", ["chrome 100"])).toBe(
			"a{color:#ef8f9480;color:lch(70% 40 20 / .5)}"
		);
		// No hex alpha either, so the fallback is the `rgba()` both read.
		expect(minifyFor("a{color:lch(70% 40 20 / .5)}", ["chrome 50"])).toBe(
			"a{color:rgba(239,143,148,.5);color:lch(70% 40 20 / .5)}"
		);
		// An alpha the engine quantizes to `255` is the opaque color, which is
		// written without an alpha at all — in either spelling.
		expect(minifyFor("a{color:hwb(194 0% 0% / .999)}", ["chrome 50"])).toBe(
			"a{color:#00c3ff;color:hwb(194 0% 0% / .999)}"
		);
		expect(minifyFor("a{color:lch(70% 40 20 / .999)}", ["chrome 100"])).toBe(
			"a{color:#ef8f94;color:lch(70% 40 20 / .999)}"
		);
	});

	it("carries the whole declaration, wherever the color stands in it", () => {
		expect(
			minifyFor("a{background:linear-gradient(oklch(0.7 0.1 20),#fff)}", [
				"chrome 100"
			])
		).toBe(
			"a{background:linear-gradient(#d68585,#fff);background:linear-gradient(oklch(.7 .1 20),#fff)}"
		);
		expect(
			minifyFor(
				"a{box-shadow:0 0 2px lab(50% 20 30),0 0 4px oklch(0.6 0.1 90)}",
				["chrome 100"]
			)
		).toBe(
			"a{box-shadow:0 0 2px #a16945,0 0 4px #977d30;" +
				"box-shadow:0 0 2px lab(50% 20 30),0 0 4px oklch(.6 .1 90)}"
		);
		expect(
			minifyFor("a{color:oklch(0.7 0.1 20)!important}", ["chrome 100"])
		).toBe("a{color:#d68585!important;color:oklch(.7 .1 20)!important}");
	});

	it("leaves the author's own fallback alone", () => {
		expect(
			minifyFor("a{color:red;color:oklch(0.7 0.1 20)}", ["chrome 100"])
		).toBe("a{color:red;color:oklch(.7 .1 20)}");
		// A declaration the body never writes is no fallback the author left, so the
		// one that survives still gets ours.
		expect(
			minifyFor("a{color:oklch(0.7 0.1 20);color:oklch(0.7 0.1 20)}", [
				"chrome 100"
			])
		).toBe("a{color:#d68585;color:oklch(.7 .1 20)}");
	});

	it("writes none where there is no color to write", () => {
		// A relative color's components are the referenced color's, not numbers.
		expect(minifyFor("a{color:oklch(from red l c h)}", ["chrome 100"])).toBe(
			"a{color:oklch(from red l c h)}"
		);
		// A custom property's value is handed back as written.
		expect(minifyFor("a{--x:oklch(0.7 0.1 20)}", ["chrome 100"])).toBe(
			"a{--x:oklch(0.7 0.1 20)}"
		);
		// The function the target does read is replaced rather than fallen back to.
		expect(minifyFor("a{color:lch(50% 0 0)}", ["chrome 100"])).toBe(
			"a{color:#777}"
		);
	});

	it("writes none where the fallback would be unreadable too", () => {
		// Chrome 100 reads none of these, so a fallback still naming one is dropped
		// by the same engine that drops the declaration it stands before.
		expect(
			minifyFor("a{color:color-mix(in oklch,oklch(0.7 0.1 20),red)}", [
				"chrome 100"
			])
		).toBe("a{color:color-mix(in oklch,oklch(.7 .1 20),red)}");
		expect(
			minifyFor("a{color:light-dark(oklch(0.7 0.1 20),red)}", ["chrome 100"])
		).toBe("a{color:light-dark(oklch(.7 .1 20),red)}");
		expect(
			minifyFor(
				"a{background:linear-gradient(oklch(0.7 0.1 20),color(display-p3 1 0 0))}",
				["chrome 100"]
			)
		).toBe(
			"a{background:linear-gradient(oklch(.7 .1 20),color(display-p3 1 0 0))}"
		);
	});

	it("folds only the functions the target is missing", () => {
		// Chrome 105 reads `hwb()` and not the Lab family, so one color of the two
		// is written another way and the other stands as the author wrote it.
		expect(
			minifyFor(
				"a{background-image:linear-gradient(hwb(120 20% 30%),oklch(0.7 0.1 20))}",
				["chrome 105"]
			)
		).toBe(
			"a{background-image:linear-gradient(hwb(120 20% 30%),#d68585);" +
				"background-image:linear-gradient(hwb(120 20% 30%),oklch(.7 .1 20))}"
		);
		expect(minifyFor("a{color:hwb(120 20% 30%)}", ["chrome 105"])).toBe(
			"a{color:hwb(120 20% 30%)}"
		);
	});

	it("writes none when the transform is off", () => {
		expect(withoutFallbacks("a{color:lab(40% 56.6 39)}", ["chrome 100"])).toBe(
			"a{color:lab(40% 56.6 39)}"
		);
	});

	it("writes one even with the color transform off", () => {
		// `shortenColors` governs writing a color the shortest way, not whether the
		// target can read the one the author wrote.
		expect(
			new SourceProcessor().process("a{color:lab(40% 56.6 39)}", {
				mode: "minify",
				environment: { browsers: ["chrome 100"] },
				transforms: { shortenColors: false }
			}).code
		).toBe("a{color:#b32323;color:lab(40% 56.6 39)}");
	});

	it("writes none with no target to answer for", () => {
		expect(minifyFor("a{color:lab(40% 56.6 39)}")).toBe(
			"a{color:lab(40% 56.6 39)}"
		);
	});
});
