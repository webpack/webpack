"use strict";

const fs = require("fs");
const path = require("path");
const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	NodeType,
	TokenType,
	TokenStream,
	parseAListOfComponentValues,
	readToken
} = require("../../../lib/css/syntax-parser");

/**
 * @param {string} css a stylesheet
 * @param {string[]=} browsers the browserslist selection to target
 * @param {import("../../../lib/css/syntax-parser").CssEnvironment=} abilities the CSS abilities the target reads
 * @returns {string} its minified serialization
 */
const minifyFor = (css, browsers, abilities) =>
	new SourceProcessor().process(css, {
		mode: "minify",
		environment: browsers ? { ...abilities, browsers } : abilities
	}).code;

// Snapshot uses the spec-style kebab-case names for multi-word token types;
// the tokenizer emits numeric `TokenType` values. Map between them so the existing
// snapshot files stay valid.
/** @type {Record<number, string>} */
const TYPE_TO_PRINTED = {
	[TokenType.Whitespace]: "whitespace",
	[TokenType.Comment]: "comment",
	[TokenType.Url]: "url",
	[TokenType.LeftCurlyBracket]: "left-curly-bracket",
	[TokenType.RightCurlyBracket]: "right-curly-bracket",
	[TokenType.LeftParenthesis]: "left-parenthesis",
	[TokenType.RightParenthesis]: "right-parenthesis",
	[TokenType.LeftSquareBracket]: "left-square-bracket",
	[TokenType.RightSquareBracket]: "right-square-bracket",
	[TokenType.Semicolon]: "semicolon",
	[TokenType.Comma]: "comma",
	[TokenType.AtKeyword]: "at-keyword",
	[TokenType.Colon]: "colon",
	[TokenType.Delim]: "delim",
	[TokenType.Number]: "number",
	[TokenType.Percentage]: "percentage",
	[TokenType.Dimension]: "dimension",
	[TokenType.Ident]: "identifier",
	[TokenType.Hash]: "hash",
	[TokenType.String]: "string",
	[TokenType.Function]: "function",
	[TokenType.CDO]: "cdo",
	[TokenType.CDC]: "cdc",
	[TokenType.BadString]: "bad-string-token",
	[TokenType.BadUrl]: "bad-url-token"
};

describe("readToken", () => {
	const casesPath = path.resolve(__dirname, "../../configCases/css/parsing/cases");
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
					/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ ({})
				);
				if (t === undefined) break;
				pos = t.end;
				const printed = TYPE_TO_PRINTED[t.type] || t.type;
				if (t.type === TokenType.Url) {
					results.push([
						printed,
						code.slice(t.start, t.end),
						code.slice(t.contentStart, t.contentEnd)
					]);
				} else if (t.type === TokenType.Hash) {
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
			/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ ({})
		);
		if (t === undefined) break;
		pos = t.end;
		out += input.slice(t.start, t.end);
	}
	return out;
};

// Regressions from the css-parsing-tests corpus: each input previously hung
// the parser or dropped bytes from the token stream.
describe("CssSyntax — the token the lexer reuses", () => {
	// The stream writes every token into one instance, so a field added to it is
	// paid on every parse and a field left out of the constructor splits the
	// shape. Both are decisions to take deliberately, which is what this pins.
	const FIELDS = [
		"contentEnd",
		"contentStart",
		"end",
		"isId",
		"start",
		"type",
		"unitStart"
	];

	it("carries exactly the fields it was built with", () => {
		const stream = new TokenStream("a{color:red}");
		expect(Object.keys(stream.next()).sort()).toEqual(FIELDS);
	});

	it("has every field set before a token is read, and after", () => {
		const stream = new TokenStream("url(a.png) 1px #ff0");
		for (const field of FIELDS) {
			expect(/** @type {EXPECTED_ANY} */ (stream.next())[field]).toBeDefined();
		}
		// Reading on does not grow it: the same keys, in the same order, whatever
		// token type wrote into it.
		for (let i = 0; i < 6; i++) {
			expect(Object.keys(stream.consume())).toEqual(
				Object.keys(stream.next())
			);
		}
	});
});

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

// A `\` carries three meanings a stylesheet a build reads never reaches, since
// each needs the source to stop mid-escape or to spell a newline the corpus
// does not: §4.3.5 inside a string and §4.3.7 everywhere else.
describe("CssSyntax — an escape the input ran out of", () => {
	const CR = String.fromCharCode(0x0d);
	const FF = String.fromCharCode(0x0c);

	/**
	 * @param {string} src css source whose first component value is a leaf token
	 * @returns {string} that token's unescaped text
	 */
	const unescapedOf = (src) =>
		/** @type {import("../../../lib/css/syntax-parser").Token} */ (
			parseAListOfComponentValues(src)[0]
		).unescaped;

	it("removes a line continuation however the newline is spelled", () => {
		expect(unescapedOf('"a\\\nb"')).toBe("ab");
		expect(unescapedOf(`"a\\${CR}b"`)).toBe("ab");
		expect(unescapedOf(`"a\\${CR}\nb"`)).toBe("ab");
		expect(unescapedOf(`"a\\${FF}b"`)).toBe("ab");
	});

	it("reads an escape before a continuation as the escape it is", () => {
		// The `\` closing `\41` is what opens the continuation, so reading the
		// two together would spell U+041B rather than `A` and `b`.
		expect(unescapedOf('"\\41\\\nb"')).toBe("Ab");
		expect(unescapedOf('"a\\\\b"')).toBe("a\\b");
		expect(unescapedOf('"a\\\\\\\nb"')).toBe("a\\b");
	});

	it("names nothing at end of input inside a string", () => {
		expect(unescapedOf('"ab\\')).toBe("ab");
		// An odd run of backslashes escaped the quote, so it closes nothing and
		// the token runs to the end of the input.
		expect(unescapedOf('"ab\\"')).toBe('ab"');
	});

	it("names the replacement character at end of input anywhere else", () => {
		expect(unescapedOf("ab\\")).toBe("ab�");
		expect(unescapedOf("#ab\\")).toBe("ab�");
		expect(unescapedOf("@ab\\")).toBe("ab�");
	});

	it("prints what the escape names rather than the backslash", () => {
		// Printing the `\` would escape the `}` or `;` written after it, so a
		// second pass would read one construct where the first wrote one.
		expect(minifyFor("a{color:re\\")).toBe("a{color:re�}");
		expect(minifyFor("@\\30 media\\")).toBe("@\\30media�;");
		expect(minifyFor('a{content:"x\\')).toBe('a{content:"x"}');
	});
});

// §4.3.8 leaves a `\` a delim only where a newline follows it. Printing one is
// therefore printing that newline: every other character it could be followed
// by makes it an escape of that character instead.
describe("CssSyntax — a backslash delim", () => {
	/**
	 * @param {string} src css source
	 * @returns {string} minified twice, to show the first pass is a fixed point
	 */
	const twice = (src) => minifyFor(minifyFor(src));

	it("keeps the newline that makes it a delim", () => {
		expect(minifyFor("a{color:re\\\n}")).toBe("a{color:re \\\n}");
		expect(minifyFor("@foo bar\\\n")).toBe("@foo bar \\\n;");
		expect(minifyFor("a[x=y\\\n]{color:red}")).toBe("a[x=y \\\n]{color:red}");
	});

	it("prints a fixed point wherever one ends a run", () => {
		// Each of these ends the run the printer then writes `;`, `}`, `{` or
		// `]` after — the characters a `\` would otherwise escape.
		for (const src of [
			"@foo bar\\\n",
			"@foo\\\n",
			"@media a\\\n{b{color:red}}",
			"a{color:re\\\n}",
			"a\\\n{color:red}",
			"a{b\\\n{color:red}}",
			"a{color:rgb(1 2 3 \\\n)}",
			"a[x=y\\\n]{color:red}",
			"a{color:red\\\n!important}"
		]) {
			expect(twice(src)).toBe(minifyFor(src));
		}
	});
});

// CSS Syntax 3 §3.3, the half webpack does not get from reading newlines as it
// tokenizes: a NUL stands for the replacement character.
describe("CssSyntax — preprocessing the input stream", () => {
	const NUL = String.fromCharCode(0);

	it("reads a NUL as the replacement character", () => {
		// U+FFFD is an ident code point where a NUL is not, so the runs either
		// side of one are a single identifier rather than three tokens.
		expect(cvTypes(`a${NUL}b`)).toEqual(cvTypes("a�b"));
		expect(
			/** @type {import("../../../lib/css/syntax-parser").Token} */ (
				parseAListOfComponentValues(`a${NUL}b`)[0]
			).unescaped
		).toBe("a\uFFFDb");
	});

	it("leaves a surrogate, which tokenizes as that character already", () => {
		// §3.3 names surrogates too, and webpack skips them because a lone one is
		// an ident code point here. Should that stop being true, this fails and
		// the replacement is owed after all.
		const HIGH = String.fromCharCode(0xd800);
		/** @type {((code: string) => string)[]} */
		const WRAPS = [
			(c) => `a${c}b`,
			(c) => `#a${c}b`,
			(c) => `@a${c}b`,
			(c) => `12${c}red`,
			(c) => `url(a${c}b)`
		];
		for (const wrap of WRAPS) {
			expect(cvTypes(wrap(HIGH))).toEqual(cvTypes(wrap("\uFFFD")));
			// And each token carries the same run, so the boundaries agree too \u2014
			// modulo the one code point, which is what is not being replaced.
			expect(
				cvUnescaped(wrap(HIGH)).map(
					(value) => value && value.split(HIGH).join("\uFFFD")
				)
			).toEqual(cvUnescaped(wrap("\uFFFD")));
		}
	});

	it("reads one wherever the source holds it", () => {
		expect(cvTypes(`12${NUL}red`)).toEqual(cvTypes("12�red"));
		expect(cvTypes(`url(a${NUL}b)`)).toEqual(cvTypes("url(a�b)"));
		expect(minifyFor(`.x${NUL}y{color:red}`)).toBe(".x�y{color:red}");
	});
});

/**
 * @param {string} src css source
 * @returns {number[]} component value types
 */
const cvTypes = (src) => parseAListOfComponentValues(src).map((n) => n.type);
/**
 * @param {string} src css source
 * @returns {(string | undefined)[]} what each component value unescapes to
 */
const cvUnescaped = (src) =>
	parseAListOfComponentValues(src).map(
		(n) =>
			/** @type {import("../../../lib/css/syntax-parser").Token} */ (n).unescaped
	);
/**
 * @param {string} src css source
 * @returns {number} the first token's type
 */
const firstTokenType = (src) =>
	/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ (
		readToken(
			src,
			0,
			/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ ({})
		)
	).type;

describe("CssSyntax — tokenizer edge cases", () => {
	it("treats an unterminated string at EOF as a string token", () => {
		expect(firstTokenType('"abc')).toBe(TokenType.String);
	});

	it("treats an unterminated url at EOF as a url token", () => {
		expect(firstTokenType("url(abc")).toBe(TokenType.Url);
		expect(firstTokenType("url(abc   ")).toBe(TokenType.Url);
	});

	it("turns a malformed url into a bad-url token", () => {
		expect(firstTokenType('url(a"b)')).toBe(TokenType.BadUrl);
		expect(firstTokenType("url(a\\26 z x)")).toBe(TokenType.BadUrl);
		// an escape encountered during bad-url recovery is consumed, not re-scanned
		expect(firstTokenType("url(a b\\)c)")).toBe(TokenType.BadUrl);
	});

	it("readToken returns undefined once the input is fully consumed", () => {
		// "a" is a single 1-char ident token; reading past it (offset 1) is EOF.
		expect(
			readToken(
				"a",
				0,
				/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ ({})
			)
		).toBeDefined();
		expect(
			readToken(
				"a",
				1,
				/** @type {import("../../../lib/css/syntax-parser").MutableToken} */ ({})
			)
		).toBeUndefined();
	});

	it("turns a newline inside a string into a bad-string token", () => {
		expect(firstTokenType('"a\nb')).toBe(TokenType.BadString);
	});

	it("consumes CRLF as a single whitespace run and inside escapes", () => {
		expect(firstTokenType("a\r\nb")).not.toBe(TokenType.EOF);
		// escaped CR/LF line-continuation inside a string exercises the
		// CRLF-collapsing escaped-newline path.
		expect(firstTokenType('"a\\\r\nb"')).toBe(TokenType.String);
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
					enter: (/** @type {import("../../../lib/css/syntax-parser").CssPath} */ path) =>
						seen.push(/** @type {string} */ (path.value()))
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

describe("CssSyntax — code point and substitution helpers", () => {
	const {
		containsSubstitutionFunction,
		isDigit,
		isHexDigit,
		isIdentCodePoint,
		isIdentStartCodePoint,
		isLetter
	} = require("../../../lib/css/syntax-parser");

	/**
	 * @param {string} s one character
	 * @returns {number} its code point
	 */
	const cp = (s) => /** @type {number} */ (s.codePointAt(0));

	it("classifies code points as CSS Syntax §4.2 defines them", () => {
		expect(["0", "9"].map((s) => isDigit(cp(s)))).toEqual([true, true]);
		expect(isDigit(cp("a"))).toBe(false);
		expect(["a", "F"].map((s) => isHexDigit(cp(s)))).toEqual([true, true]);
		expect(isHexDigit(cp("g"))).toBe(false);
		expect(["a", "Z"].map((s) => isLetter(cp(s)))).toEqual([true, true]);
		expect(isLetter(cp("_"))).toBe(false);
		// Non-ASCII and `_` start an identifier; a digit or `-` only continues one.
		expect(["é", "_", "a"].map((s) => isIdentStartCodePoint(cp(s)))).toEqual([
			true,
			true,
			true
		]);
		expect(["1", "-"].map((s) => isIdentStartCodePoint(cp(s)))).toEqual([
			false,
			false
		]);
		expect(["1", "-", "é"].map((s) => isIdentCodePoint(cp(s)))).toEqual([
			true,
			true,
			true
		]);
		expect(isIdentCodePoint(cp(" "))).toBe(false);
	});

	it("finds a substitution function in a value", () => {
		expect(containsSubstitutionFunction("var(--x)")).toBe(true);
		expect(containsSubstitutionFunction("calc(1px + env(safe-area-inset-top))")).toBe(
			true
		);
		expect(containsSubstitutionFunction("calc(1px + 2px)")).toBe(false);
		expect(containsSubstitutionFunction("red")).toBe(false);
	});
});
