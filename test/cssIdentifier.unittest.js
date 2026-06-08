"use strict";

const walkCssTokens = require("../lib/css/walkCssTokens");
const { cssExportConvention } = require("../lib/util/conventions");
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
			["a\\b", "a\\\\b"],
			// a `\HEX` escape followed by a non-hex char drops the redundant space
			["\tz", "\\9z"],
			["\nz", "\\Az"]
		];

		for (const [input, expected] of cases) {
			it(`escapes ${JSON.stringify(input)} -> ${JSON.stringify(
				expected
			)}`, () => {
				expect(escapeIdentifier(input)).toBe(expected);
			});
		}

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
			it(`unescapes ${JSON.stringify(input)} -> ${JSON.stringify(
				expected
			)}`, () => {
				expect(unescapeIdentifier(input)).toBe(expected);
			});
		}

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

	// Deterministic fuzzing: a seeded PRNG drives random/edge-case inputs
	// (control chars, lone surrogates, backslash escapes, leading digit/hyphen)
	// so any failure is reproducible. Guards the string utils against crashes
	// and escape/unescape round-trip violations.
	describe("fuzzing (seeded)", () => {
		const { escapeIdentifier, unescapeIdentifier, equalsLowerCase } =
			walkCssTokens;
		// mulberry32
		const makeRng = (seed) => {
			let s = seed >>> 0;
			return () => {
				s = (s + 0x6d2b79f5) >>> 0;
				let t = Math.imul(s ^ (s >>> 15), 1 | s);
				t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
		};
		const POOLS = [
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
			"\\\\\\41\\3 \\{}\\@.#:;()[]<>\"' \t\n\r\f",
			"-_0123456789"
		];
		const randStr = (rng) => {
			const len = (rng() * 40) | 0;
			const surrogateMode = rng() < 0.2;
			let out = "";
			for (let i = 0; i < len; i++) {
				if (surrogateMode) {
					// any BMP code unit, including lone surrogates 0xD800-0xDFFF
					out += String.fromCharCode((rng() * 0x10000) | 0);
				} else {
					const pool = POOLS[(rng() * POOLS.length) | 0];
					out += pool[(rng() * pool.length) | 0];
				}
			}
			return out;
		};

		it("escape/unescape never throw and round-trip on random input", () => {
			const rng = makeRng(0x12345678);
			/** @type {string[]} */
			const failures = [];
			for (let i = 0; i < 50000; i++) {
				const s = randStr(rng);
				try {
					if (unescapeIdentifier(escapeIdentifier(s)) !== s) {
						failures.push(`round-trip: ${JSON.stringify(s)}`);
					}
					unescapeIdentifier(s);
					equalsLowerCase(s, "button");
				} catch (err) {
					failures.push(`throw on ${JSON.stringify(s)}: ${err.message}`);
				}
			}
			expect(failures).toEqual([]);
		});

		it("cssExportConvention never throws on random input", () => {
			const rng = makeRng(0x9abcdef0);
			/** @type {import("../declarations/WebpackOptions").CssGeneratorExportsConvention[]} */
			const conventions = [
				"as-is",
				"camel-case",
				"camel-case-only",
				"dashes",
				"dashes-only"
			];
			/** @type {string[]} */
			const failures = [];
			for (let i = 0; i < 20000; i++) {
				const s = randStr(rng);
				for (const c of conventions) {
					try {
						cssExportConvention(s, c);
					} catch (err) {
						failures.push(`${c} on ${JSON.stringify(s)}: ${err.message}`);
					}
				}
			}
			expect(failures).toEqual([]);
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
