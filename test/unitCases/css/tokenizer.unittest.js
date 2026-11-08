"use strict";

const { fixture } = require("../../helpers/fixture");

// Each fixture's tokens are in `invariants.unittest.js`'s snapshot; these hold
// the token object, the stream, the helpers and what no fixture can hold.

const fs = require("fs");
const path = require("path");
const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	A,
	NodeType,
	parseAListOfComponentValues,
	readToken,
	TokenStream,
	TokenType
} = require("../../../lib/css/syntax-parser");

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
		const stream = new TokenStream(fixture("css", "css-syntax-minify-the-value-transforms-rejection-paths-a-named-color-the-14"));
		expect(Object.keys(stream.next()).sort()).toEqual(FIELDS);
	});

	it("has every field set before a token is read, and after", () => {
		const stream = new TokenStream(fixture("css", "css-syntax-the-token-the-lexer-reuses-has-every-field-set-before-a-token-is-read"));
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
	const C1 = String.fromCharCode(0x80); // U+0080: an ident-start code point

	it("does not hang on a literal U+0080 ident-start code point", () => {
		expect(parseAListOfComponentValues(C1, 0, {})).toHaveLength(1);
		expect(parseAListOfComponentValues(`a${C1}b`, 0, {})).toHaveLength(1);
	});

	it("does not hang on a backslash at EOF inside a url token", () => {
		expect(parseAListOfComponentValues(fixture("css", "css-syntax-regressions-does-not-hang-on-a-backslash-at-eof-inside-a-url-token"), 0, {})).toHaveLength(1);
		expect(parseAListOfComponentValues(fixture("css", "css-syntax-regressions-does-not-hang-on-a-backslash-at-eof-inside-a-url-token-2"), 0, {})).toHaveLength(1);
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
	 * @returns {string | number} that token's unescaped text
	 */
	const unescapedOf = (src) => A.value(parseAListOfComponentValues(src)[0]);

	it("removes a line continuation however the newline is spelled", () => {
		expect(unescapedOf(fixture("css", "css-syntax-token-value-decoding-resolves-string-escapes-and-line-continuations-4-6"))).toBe("ab");
		expect(unescapedOf(`"a\\${CR}b"`)).toBe("ab");
		expect(unescapedOf(`"a\\${CR}\nb"`)).toBe("ab");
		expect(unescapedOf(`"a\\${FF}b"`)).toBe("ab");
	});

	it("reads an escape before a continuation as the escape it is", () => {
		// The `\` closing `\41` is what opens the continuation, so reading the
		// two together would spell U+041B rather than `A` and `b`.
		expect(unescapedOf(fixture("css", "css-syntax-an-escape-the-input-ran-out-of-reads-an-escape-before-a-continuation"))).toBe("Ab");
		expect(unescapedOf(fixture("css", "css-syntax-token-value-decoding-resolves-string-escapes-and-line-continuations-4-2"))).toBe("a\\b");
		expect(unescapedOf(fixture("css", "css-syntax-an-escape-the-input-ran-out-of-reads-an-escape-before-a-continuation-2"))).toBe("a\\b");
	});

	it("names nothing at end of input inside a string", () => {
		expect(unescapedOf(fixture("css", "css-syntax-regressions-emits-a-string-with-a-trailing-backslash-at-eof"))).toBe("ab");
		// An odd run of backslashes escaped the quote, so it closes nothing and
		// the token runs to the end of the input.
		expect(unescapedOf(fixture("css", "css-syntax-an-escape-the-input-ran-out-of-names-nothing-at-end-of-input-inside-a"))).toBe('ab"');
	});

	it("names the replacement character at end of input anywhere else", () => {
		expect(unescapedOf(fixture("css", "css-syntax-an-escape-the-input-ran-out-of-names-the-replacement-character-at-end"))).toBe("ab�");
		expect(unescapedOf(fixture("css", "css-syntax-an-escape-the-input-ran-out-of-names-the-replacement-character-at-end-2"))).toBe("ab�");
		expect(unescapedOf(fixture("css", "css-syntax-an-escape-the-input-ran-out-of-names-the-replacement-character-at-end-3"))).toBe("ab�");
	});
});

// CSS Syntax 3 §3.3, the half webpack does not get from reading newlines as it
// tokenizes: a NUL stands for the replacement character.
describe("CssSyntax — preprocessing the input stream", () => {
	const NUL = String.fromCharCode(0);

	it("reads a NUL as the replacement character", () => {
		// U+FFFD is an ident code point where a NUL is not, so the runs either
		// side of one are a single identifier rather than three tokens.
		expect(cvTypes(`a${NUL}b`)).toEqual(cvTypes(fixture("css", "css-syntax-preprocessing-the-input-stream-reads-a-nul-as-the-replacement")));
		expect(A.value(parseAListOfComponentValues(`a${NUL}b`)[0])).toBe(
			"a\uFFFDb"
		);
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
					(value) => value.split(HIGH).join("\uFFFD")
				)
			).toEqual(cvUnescaped(wrap("\uFFFD")));
		}
	});

	it("reads one wherever the source holds it", () => {
		expect(cvTypes(`12${NUL}red`)).toEqual(cvTypes(fixture("css", "css-syntax-preprocessing-the-input-stream-leaves-a-surrogate-which-tokenizes-as")));
		expect(cvTypes(`url(a${NUL}b)`)).toEqual(cvTypes(fixture("css", "css-syntax-preprocessing-the-input-stream-leaves-a-surrogate-which-tokenizes-as-2")));
	});
});

/**
 * @param {string} src css source
 * @returns {number[]} component value types
 */
const cvTypes = (src) =>
	parseAListOfComponentValues(src).map((n) => A.type(n));
/**
 * @param {string} src css source
 * @returns {string[]} what each component value unescapes to, a unit after its number
 */
const cvUnescaped = (src) =>
	parseAListOfComponentValues(src).map((n) => `${A.value(n)}${A.name(n)}`);

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
		["a closing quote", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-a-closing-quote"), ["xy"]],
		["end of input", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-end-of-input"), ["xy"]],
		["end of input, holding a brace", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-end-of-input-2"), ["xy}"]],
		["end of input, holding only one", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-end-of-input-4"), ["}"]],
		["end of input, holding nothing", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-end-of-input-3"), [""]],
		["a double quote at end of input", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-a-double-quote-at"), ["d"]],
		["an empty string", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-an-empty-string"), [""]],
		["a quote the source escaped", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-a-quote-the"), ["a'"]],
		["one escaped at end of input", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-one-escaped-at"), ["a'"]],
		["a backslash the source escaped", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-a-backslash-the"), [fixture("css", "source-processor-merging-adjacent-style-reads-a-sheet-s-closed-comment-escape-9")]],
		["two of them", fixture("css", "css-syntax-a-string-the-source-never-closed-reads-one-ended-by-two-of-them"), ["x", "y"]]
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

describe("CssSyntax — the token stream", () => {
	const { _S } = require("../../../lib/css/syntax-parser");

	/**
	 * @param {TokenStream} stream a stream
	 * @returns {[number, string]} the next token's type and source text
	 */
	const peek = (stream) => {
		const t = stream.next();
		return [t.type, stream.input.slice(t.start, t.end)];
	};

	it("fires each comment once, even when a mark rewinds over it", () => {
		/** @type {string[]} */
		const seen = [];
		const stream = new TokenStream(
			fixture("css", "css-syntax-the-token-stream-fires-each-comment-once-even-when-a-mark-rewinds"),
			0,
			undefined,
			(input, start, end) => seen.push(input.slice(start, end))
		);
		stream.mark();
		expect(stream.consume().start).toBe(5);
		expect(stream.consume().type).toBe(TokenType.Whitespace);
		stream.restoreMark();
		// The rewound span is lexed again, comments included, without re-firing.
		expect(peek(stream)).toEqual([TokenType.Ident, "a"]);
		stream.consume();
		expect(peek(stream)).toEqual([TokenType.Whitespace, " "]);
		expect(seen).toEqual(["/*1*/", "/*2*/"]);
	});

	it("notes where a comment the source never closed opens", () => {
		/**
		 * @param {string} src css source
		 * @returns {number} the offset of its unclosed comment, or -1
		 */
		const openCommentOf = (src) => {
			parseAListOfComponentValues(src);
			return _S._openCommentStart;
		};
		expect(openCommentOf(fixture("css", "css-syntax-the-token-stream-notes-where-a-comment-the-source-never-closed-opens"))).toBe(2);
		expect(openCommentOf(fixture("css", "css-syntax-path-reads-on-every-node-kind-reads-a-comment-s-text-closed-or-2"))).toBe(0);
		// `/*/` and `/* **` end in what could close a comment, but not one opened there.
		expect(openCommentOf(fixture("css", "css-syntax-the-token-stream-notes-where-a-comment-the-source-never-closed-opens-2"))).toBe(1);
		expect(openCommentOf(fixture("css", "css-syntax-the-token-stream-notes-where-a-comment-the-source-never-closed-opens-3"))).toBe(1);
		expect(openCommentOf(fixture("css", "css-syntax-the-token-stream-notes-where-a-comment-the-source-never-closed-opens-4"))).toBe(-1);
		expect(openCommentOf(fixture("css", "css-syntax-the-token-stream-notes-where-a-comment-the-source-never-closed-opens-5"))).toBe(-1);
	});

	it("steps over whitespace without lexing it, unless a token is cached", () => {
		const stream = new TokenStream(fixture("css", "css-syntax-the-token-stream-steps-over-whitespace-without-lexing-it-unless-a"));
		stream.skipWhitespace();
		expect(peek(stream)).toEqual([TokenType.Ident, "a"]);
		// The cached `a` is still the next token.
		stream.skipWhitespace();
		expect(stream.next().start).toBe(4);
	});

	it("steps over a selector prelude up to what has to be lexed", () => {
		/**
		 * @param {string} src css source
		 * @returns {[number, string]} the next token after skipping prelude leaves
		 */
		const afterPrelude = (src) => {
			const stream = new TokenStream(src);
			stream.skipPreludeLeaves();
			return peek(stream);
		};
		expect(afterPrelude(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be"))).toEqual([TokenType.LeftCurlyBracket, "{"]);
		// A name running into `(` is lexed with it, as one function or url token.
		expect(afterPrelude(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be-2"))).toEqual([TokenType.Function, "not("]);
		expect(afterPrelude(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be-3"))).toEqual([TokenType.Function, "ab("]);
		expect(afterPrelude(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be-4"))).toEqual([TokenType.Url, "url(x)"]);
		expect(afterPrelude(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be-5"))).toEqual([TokenType.LeftParenthesis, "("]);
		expect(afterPrelude(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be-6"))).toEqual([TokenType.EOF, ""]);
	});

	it("does not step over a prelude while a token is cached", () => {
		const stream = new TokenStream(fixture("css", "css-syntax-the-token-stream-steps-over-a-selector-prelude-up-to-what-has-to-be"));
		stream.next();
		stream.skipPreludeLeaves();
		expect(peek(stream)).toEqual([TokenType.Ident, "a"]);
	});

	it("parses on from where an existing stream stands", () => {
		const stream = new TokenStream(fixture("css", "css-syntax-the-token-stream-parses-on-from-where-an-existing-stream-stands"));
		stream.consume();
		expect(cvTypes(/** @type {EXPECTED_ANY} */ (stream))).toEqual([
			NodeType.Whitespace,
			NodeType.Ident,
			NodeType.Whitespace,
			NodeType.Ident
		]);
	});
});

describe("CssSyntax — name and range helpers", () => {
	const webpack = require("webpack");
	const { terminateIdentifier, unescapeIdentifier } = webpack.css.syntax.parser;
	const {
		_trimCssWhiteSpace,
		asciiLowercaseName,
		isDashedIdentifier,
		isSimpleIdentifier,
		rangeAsciiCaseInsensitiveMatch,
		rangeEquals,
		skipEscape,
		toLowerCaseIfNeeded
	} = require("../../../lib/css/syntax-parser");

	it.each([
		["foo", "foo"],
		["\\31", "\\31 "],
		["\\000031", "\\000031 "],
		["\\000031f", "\\000031f"],
		["\\31 ", "\\31 "],
		["\\31-start", "\\31-start"],
		["\\\\31", "\\\\31"],
		["\\\\\\31", "\\\\\\31 "],
		["\\--foo", "\\--foo"]
	])("preserves the separator after %s", (input, expected) => {
		const terminated = terminateIdentifier(input);
		expect(terminated).toBe(expected);
		expect(unescapeIdentifier(`${terminated} next`)).toBe(
			`${unescapeIdentifier(input)} next`
		);
	});

	it("trims only the whitespace CSS skips", () => {
		expect(_trimCssWhiteSpace(" \t\na\n\f ")).toBe("a");
		expect(_trimCssWhiteSpace("   ")).toBe("");
		// U+00A0 is an ident code point, not whitespace.
		expect(_trimCssWhiteSpace(" x ")).toBe(" x ");
		expect(_trimCssWhiteSpace("ab")).toBe("ab");
	});

	it("matches a source range against a literal", () => {
		expect(rangeEquals("a{color}", 2, 7, "color")).toBe(true);
		expect(rangeEquals("a{Color}", 2, 7, "color")).toBe(false);
		expect(rangeEquals("a{color}", 2, 6, "color")).toBe(false);
		expect(rangeAsciiCaseInsensitiveMatch("@MeDiA x", 1, 6, "media")).toBe(
			true
		);
		expect(rangeAsciiCaseInsensitiveMatch("@medic x", 1, 6, "media")).toBe(
			false
		);
		expect(rangeAsciiCaseInsensitiveMatch("@media x", 1, 7, "media")).toBe(
			false
		);
	});

	it("lowercases a string only where it can change", () => {
		const plain = "color";
		expect(toLowerCaseIfNeeded(plain)).toBe(plain);
		expect(toLowerCaseIfNeeded("COLOR")).toBe("color");
		expect(toLowerCaseIfNeeded("Été")).toBe("été");
	});

	it("folds only the ASCII letters of a name, and not one with an escape", () => {
		expect(asciiLowercaseName("color")).toBe("color");
		expect(asciiLowercaseName("BackGround")).toBe("background");
		// CSS matches names ASCII case-insensitively, so `É` stays as written.
		expect(asciiLowercaseName("ÉA")).toBe("Éa");
		expect(asciiLowercaseName("\\47 Rid")).toBe("\\47 Rid");
	});

	it("recognizes a dashed ident and a plain identifier", () => {
		expect(isDashedIdentifier("--x")).toBe(true);
		expect(isDashedIdentifier("--")).toBe(false);
		expect(isDashedIdentifier("-x")).toBe(false);
		expect(isSimpleIdentifier("foo-bar")).toBe(true);
		expect(isSimpleIdentifier("-foo")).toBe(true);
		expect(isSimpleIdentifier("1a")).toBe(false);
		expect(isSimpleIdentifier("a b")).toBe(false);
		expect(isSimpleIdentifier("a\\62")).toBe(false);
	});

	it("steps over an escape from its backslash", () => {
		// A hex escape takes up to six digits and one whitespace after them.
		expect(skipEscape("\\41 b", 0)).toBe(4);
		expect(skipEscape("a\\x", 1)).toBe(3);
		expect(skipEscape("\\", 0)).toBe(1);
	});
});

describe("CssSyntax — a signed number printed after a number", () => {
	/**
	 * @param {string} src css source
	 * @returns {[number, string][]} each component value's type and source text
	 */
	const valuesOf = (src) =>
		parseAListOfComponentValues(src).map((n) => [A.type(n), A.source(n)]);

	it("drops the space where the sign starts a number of its own", () => {
		expect(valuesOf(fixture("css", "css-syntax-a-signed-number-printed-after-a-number-drops-the-space-where-the-sign-3"))).toEqual([
			[NodeType.Number, "0"],
			[NodeType.Dimension, "-2px"]
		]);
		expect(valuesOf(fixture("css", "css-syntax-a-signed-number-printed-after-a-number-drops-the-space-where-the-sign-4"))).toEqual([
			[NodeType.Number, "0"],
			[NodeType.Dimension, "-.5px"]
		]);
	});

	it("keeps the space where the sign would start a unit", () => {
		expect(valuesOf(fixture("css", "css-syntax-a-signed-number-printed-after-a-number-keeps-the-space-where-the-sign-2"))).toEqual([[NodeType.Dimension, fixture("css", "css-syntax-a-signed-number-printed-after-a-number-keeps-the-space-where-the-sign-2")]]);
	});
});
