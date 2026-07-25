"use strict";

// cspell:ignore tokr

const acorn = require("acorn");
const JavascriptTokenizer = require("../lib/javascript/JavascriptTokenizer");

/**
 * @param {unknown} value token value
 * @returns {unknown} value comparable with `toEqual` (bigint/regexp normalized)
 */
const normalizeValue = (value) => {
	if (typeof value === "bigint") return `bigint:${value}`;
	if (value && typeof value === "object" && "pattern" in value) {
		return {
			pattern: /** @type {{ pattern: string }} */ (value).pattern,
			flags: /** @type {{ flags: string }} */ (value).flags
		};
	}
	return value;
};

/**
 * @param {string} code source
 * @param {object=} options extra tokenizer options
 * @returns {[string, unknown, number, number][]} tokens
 */
const tokenize = (code, options) => {
	const tokenizer = new JavascriptTokenizer(code, {
		ecmaVersion: "latest",
		...options
	});
	const tokens = [];
	for (const token of tokenizer) {
		tokens.push([
			token.type.label,
			normalizeValue(token.value),
			token.start,
			token.end
		]);
	}
	return tokens;
};

/**
 * @param {string} code source
 * @param {object=} options extra tokenizer options
 * @returns {[string, unknown, number, number][]} acorn reference tokens
 */
const tokenizeAcorn = (code, options) => {
	const tokens = [];
	for (const token of acorn.tokenizer(code, {
		ecmaVersion: "latest",
		...options
	})) {
		if (token.type === acorn.tokTypes.eof) break;
		tokens.push([
			token.type.label,
			normalizeValue(token.value),
			token.start,
			token.end
		]);
	}
	return tokens;
};

describe("JavascriptTokenizer", () => {
	describe("matches acorn.tokenizer token-for-token", () => {
		// template literals below are lexer inputs, not JS template strings
		/* eslint-disable no-template-curly-in-string */
		const cases = [
			"var x = 1;",
			"a / b / c",
			"var re = /ab+c/gi;",
			"x = a ? /re/ : b / c;",
			"`a${1 + 2}b${`c${x}d`}e`",
			"tag`raw text ${x} more`",
			"tag`bad \\q escape ${y}`",
			"const s = 'a\\nb\\tc\\\\d\\'e\\x41\\u0041\\u{1F600}f';",
			'const t = "\\v\\b\\f\\r\\0 tail";',
			"0x1F + 0o17 + 0b101 + 1_000 + 1.5e-10 + .5 + 123n + 0xFFn",
			"077 + 09",
			"a ** b **= c *= d %= e",
			"a || b && c |= d &= e ^= f ?? g",
			"a << b >> c >>> d <<= e >>= f",
			"a <= b >= c == d != e === f !== g",
			"a => b, ...rest",
			"x?.y?.[z]?.(w)",
			"class A extends B { #priv = 1; #m(){ return this.#priv; } }",
			"async function* gen(){ yield* await foo; }",
			"label: for (;;) { continue label; }",
			"x <!-- html comment\ny",
			"--> not-at-start; \n--> at start",
			"let of = 1; for (of of of) {}",
			"import.meta.url; new.target;",
			"日本語 = 'ok'; \\u0041B = 2;",
			"// line\n/* block */ 42",
			"a b c"
		];
		/* eslint-enable no-template-curly-in-string */
		for (const code of cases) {
			it(`tokenizes ${JSON.stringify(code)}`, () => {
				expect(tokenize(code)).toEqual(tokenizeAcorn(code));
			});
		}
	});

	describe("token values", () => {
		it("classifies keywords, names and contextual words", () => {
			expect(tokenize("return let async of x")).toEqual([
				["return", "return", 0, 6],
				["name", "let", 7, 10],
				["name", "async", 11, 16],
				["name", "of", 17, 19],
				["name", "x", 20, 21]
			]);
		});

		it("reads numbers of every form", () => {
			const num = (code) => tokenize(code)[0];
			expect(num("42")).toEqual(["num", 42, 0, 2]);
			expect(num("3.14")).toEqual(["num", 3.14, 0, 4]);
			expect(num("1e3")).toEqual(["num", 1000, 0, 3]);
			expect(num("0xff")).toEqual(["num", 255, 0, 4]);
			expect(num("0o17")).toEqual(["num", 15, 0, 4]);
			expect(num("0b101")).toEqual(["num", 5, 0, 5]);
			expect(num("1_000")).toEqual(["num", 1000, 0, 5]);
			expect(num("10n")).toEqual(["num", "bigint:10", 0, 3]);
			expect(num("0x10n")).toEqual(["num", "bigint:16", 0, 5]);
		});

		it("cooks string escapes (including \\v and octal)", () => {
			expect(tokenize("'a\\vb'")[0][1]).toBe("a\u000Bb");
			expect(tokenize("'\\101'")[0][1]).toBe("A");
			expect(tokenize("'\\x41\\u0041'")[0][1]).toBe("AA");
		});

		it("cooks template chunks and normalizes CRLF", () => {
			expect(tokenize("`a\r\nb`")).toEqual([
				["`", undefined, 0, 1],
				["template", "a\nb", 1, 5],
				["`", undefined, 5, 6]
			]);
		});

		it("produces invalidTemplate for a bad escape in a tagged template", () => {
			const tokens = tokenize("tag`\\u{}`");
			expect(tokens.some(([label]) => label === "invalidTemplate")).toBe(true);
		});

		it("reads a private identifier", () => {
			expect(tokenize("this.#field")).toEqual([
				["this", "this", 0, 4],
				[".", undefined, 4, 5],
				["privateId", "field", 5, 11]
			]);
		});

		it("reads a regexp with pattern and flags", () => {
			expect(tokenize("/ab+/giu")).toEqual([
				["regexp", { pattern: "ab+", flags: "giu" }, 0, 8]
			]);
		});
	});

	describe("errors", () => {
		it("throws on an unterminated string", () => {
			expect(() => tokenize("'abc")).toThrow(/Unterminated string/);
		});

		it("throws on an unterminated block comment", () => {
			expect(() => tokenize("/* nope")).toThrow(/Unterminated comment/);
		});

		it("throws on an unterminated template", () => {
			expect(() => tokenize("`abc")).toThrow(/Unterminated template/);
		});

		it("throws on an unterminated regexp", () => {
			expect(() => tokenize("var x = /ab")).toThrow(
				/Unterminated regular expression/
			);
		});

		it("throws on an identifier directly after a number", () => {
			expect(() => tokenize("3in")).toThrow(/Identifier directly after number/);
		});

		it("throws on an unexpected character", () => {
			expect(() => tokenize("@")).toThrow(/Unexpected character/);
		});
	});

	describe("options", () => {
		it("resolves ecmaVersion and treats modules as strict", () => {
			const tokenizer = new JavascriptTokenizer("x", {
				ecmaVersion: 2020,
				sourceType: "module"
			});
			expect(tokenizer.ecmaVersion).toBe(11);
			expect(tokenizer.strict).toBe(true);
			expect(new JavascriptTokenizer("x").ecmaVersion).toBe(1e8);
		});

		it("rejects a legacy octal in strict (module) mode", () => {
			expect(() => tokenize("077", { sourceType: "module" })).toThrow(
				/Invalid number/
			);
		});

		it("tokenizes ES5 source (no template/bigint/optional-chaining)", () => {
			const code = "var x = 1; function f(){ return x; }";
			expect(tokenize(code, { ecmaVersion: 5 })).toEqual(
				tokenizeAcorn(code, { ecmaVersion: 5 })
			);
		});
	});

	describe("grammar-context coverage vs acorn", () => {
		// exercises braceIsBlock, updateContext and inGeneratorContext branches
		/* eslint-disable no-template-curly-in-string */
		const snippet = [
			"function* gen(x) {",
			"  const obj = { a: 1, b() {}, get c() { return 2; }, ...rest };",
			"  label: for (const k of obj) { if (k) continue label; else break; }",
			"  do { yield k; } while (x);",
			"  switch (x) { case 1: { let y = 2; } default: ; }",
			"  try { throw new Error('x'); } catch (e) { } finally { }",
			"  return x ? /re/g : x / 2;",
			"}",
			"const arrow = (a, b) => { return a + b; };",
			"class C extends Object { static s = 1; #p = 2; m() { return this.#p; } }",
			"tag`t ${gen} y`; new.target; import.meta.url;"
		].join("\n");

		/* eslint-enable no-template-curly-in-string */
		it("matches acorn across many statement and expression forms", () => {
			expect(tokenize(snippet)).toEqual(tokenizeAcorn(snippet));
		});
	});

	describe("edge cases and recoverable errors", () => {
		it("clamps an over-long octal escape like acorn", () => {
			expect(tokenize("'\\777'")[0][1]).toBe(tokenizeAcorn("'\\777'")[0][1]);
		});

		it("cooks a unicode escape inside an identifier", () => {
			expect(tokenize("\\u0041b")).toEqual([["name", "Ab", 0, 7]]);
		});

		it("yields a null regexp value when the pattern cannot compile", () => {
			const [label, value] = tokenize("var r = /a{2,1}/;")[3];
			expect(label).toBe("regexp");
			expect(value).toEqual({ pattern: "a{2,1}", flags: "" });
		});

		it("rejects malformed numeric separators", () => {
			expect(() => tokenize("1__0")).toThrow(/Numeric separator/);
			expect(() => tokenize("1_")).toThrow(/Numeric separator/);
			expect(() => tokenize("0_1")).toThrow(/Numeric separator|legacy octal/);
		});

		it("supports overrideContext on the context stack", () => {
			const tokenizer = new JavascriptTokenizer("`a`", {
				ecmaVersion: "latest"
			});
			tokenizer.next();
			const target = tokenizer.curContext();
			tokenizer.overrideContext(target);
			expect(tokenizer.curContext()).toBe(target);
		});
	});
});
