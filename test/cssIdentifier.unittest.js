"use strict";

const CssParser = require("../lib/css/CssParser");
const walkCssTokens = require("../lib/css/walkCssTokens");
const { makeCacheable } = require("../lib/util/identifier");

describe("css identifier utils", () => {
	describe("escapeIdentifier", () => {
		const { escapeIdentifier } = walkCssTokens;

		// [input, expected]
		/** @type {[string, string][]} */
		const cases = [
			["foo", "foo"],
			["foo bar", "foo\\ bar"],
			["a.b", "a\\.b"],
			["1abc", "\\31 abc"],
			["-1foo", "\\-1foo"],
			["--foo", "\\--foo"],
			["♥", "♥"],
			["©", "©"],
			["foo\tbar", "foo\\9 bar"],
			["foo\nbar", "foo\\A bar"],
			["foo\fbar", "foo\\C bar"],
			["a\\b", "a\\\\b"]
		];

		for (const [input, expected] of cases) {
			it(`escapes ${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
				expect(escapeIdentifier(input)).toBe(expected);
			});
		}

		it("re-exports the same function on CssParser", () => {
			expect(CssParser.escapeIdentifier).toBe(escapeIdentifier);
		});

		it("preserves the result when the same cache object is reused", () => {
			const cache = {};
			expect(escapeIdentifier("foo bar", cache)).toBe("foo\\ bar");
			expect(escapeIdentifier("foo bar", cache)).toBe("foo\\ bar");
		});

		it("bindCache returns a function that produces correct results", () => {
			const cache = {};
			const bound = escapeIdentifier.bindCache(cache);
			expect(bound("foo bar")).toBe("foo\\ bar");
			expect(bound("baz")).toBe("baz");
		});

		it("works without a cache object", () => {
			expect(escapeIdentifier("foo bar")).toBe("foo\\ bar");
		});
	});

	describe("unescapeIdentifier", () => {
		const { unescapeIdentifier } = walkCssTokens;

		// [input, expected]
		/** @type {[string, string][]} */
		const cases = [
			["foo", "foo"],
			["foo\\ bar", "foo bar"],
			["\\31 23", "123"],
			["\\31 a2b3c", "1a2b3c"],
			["\\#fake-id", "#fake-id"],
			["foo\\.bar", "foo.bar"],
			["\\3A )", ":)"],
			// double backslash is preserved
			["foo\\\\bar", "foo\\bar"],
			// trailing single backslash retained
			["foo\\", "foo\\"],
			// null code point -> replacement character
			["\\0 ", "�"],
			// surrogate -> replacement character
			["\\D800 ", "�"],
			// no escapes -> fast path returns input
			["plain-identifier", "plain-identifier"]
		];

		for (const [input, expected] of cases) {
			it(`unescapes ${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
				expect(unescapeIdentifier(input)).toBe(expected);
			});
		}

		it("re-exports the same function on CssParser", () => {
			expect(CssParser.unescapeIdentifier).toBe(unescapeIdentifier);
		});

		it("preserves the result when the same cache object is reused", () => {
			const cache = {};
			expect(unescapeIdentifier("\\31 23", cache)).toBe("123");
			expect(unescapeIdentifier("\\31 23", cache)).toBe("123");
		});

		it("bindCache returns a function that produces correct results", () => {
			const cache = {};
			const bound = unescapeIdentifier.bindCache(cache);
			expect(bound("\\31 23")).toBe("123");
			expect(bound("foo\\.bar")).toBe("foo.bar");
		});

		it("round-trips through escapeIdentifier for common values", () => {
			const { escapeIdentifier } = walkCssTokens;
			for (const value of [
				"foo bar",
				"foo.bar",
				"#hello",
				":)",
				"a!b",
				"--var"
			]) {
				expect(unescapeIdentifier(escapeIdentifier(value))).toBe(value);
			}
		});
	});

	// `escapeIdentifier` / `unescapeIdentifier` are wrapped via the same
	// `makeCacheable` primitive used by `parseResource` / `makePathsRelative`.
	// The tests above only check correctness of the returned values, which
	// String value-equality would satisfy even if no cache were involved. The
	// tests below observe caching directly by counting how often the wrapped
	// implementation runs.
	describe("makeCacheable (the shared cache primitive)", () => {
		it("only invokes the wrapped function once per (cache, input)", () => {
			let calls = 0;
			const cached = makeCacheable((str) => {
				calls++;
				return `[${str}]`;
			});
			const cache = {};
			expect(cached("a", cache)).toBe("[a]");
			expect(cached("a", cache)).toBe("[a]");
			expect(cached("a", cache)).toBe("[a]");
			expect(calls).toBe(1);
			cached("b", cache);
			expect(calls).toBe(2);
		});

		it("invokes the wrapped function every call without a cache", () => {
			let calls = 0;
			const cached = makeCacheable((str) => {
				calls++;
				return `[${str}]`;
			});
			cached("a");
			cached("a");
			expect(calls).toBe(2);
		});

		it("uses an independent cache per cache object", () => {
			let calls = 0;
			const cached = makeCacheable((str) => {
				calls++;
				return `[${str}]`;
			});
			const cacheA = {};
			const cacheB = {};
			cached("a", cacheA);
			cached("a", cacheB);
			expect(calls).toBe(2);
			cached("a", cacheA);
			expect(calls).toBe(2);
		});

		it("bindCache returns a function that caches by input", () => {
			let calls = 0;
			const cached = makeCacheable((str) => {
				calls++;
				return `[${str}]`;
			});
			const bound = cached.bindCache({});
			bound("a");
			bound("a");
			bound("b");
			expect(calls).toBe(2);
		});
	});
});
