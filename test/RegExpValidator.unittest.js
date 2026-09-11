"use strict";

const acorn = require("acorn");
const { Parser } = require("../lib/javascript/parser");

// The owned validator runs on the lazy path only for a pattern the host
// engine rejected; the base parser validates every literal, as acorn does.
/** @type {import("acorn").ecmaVersion[]} */
const ECMA_VERSIONS = [5, 2015, 2017, 2018, 2020, 2022, 2024, 2025, "latest"];

/** @type {[string, string][]} */
const PATTERNS = [
	// anchors, assertions and lookaround
	["^abc$", ""],
	["\\bword\\B", ""],
	["(?=a)(?!b)", ""],
	["(?<=a)(?<!b)", ""],
	["(?=a)*", ""],
	["(?=a)*", "u"],
	["(?<=a)+", ""],
	["\\b+", ""],
	["^*", ""],
	// quantifiers and braces
	["a*b+c?d{2}e{2,}f{2,3}", ""],
	["a*?b+?c??d{2}?e{2,}?f{2,3}?", ""],
	["a{3,2}", ""],
	["a{", ""],
	["a{", "u"],
	["a{1", ""],
	["a{1", "u"],
	["a{1,", "u"],
	["{1}", ""],
	["{1}", "u"],
	["}", ""],
	["}", "u"],
	["]", ""],
	["]", "u"],
	["a**", ""],
	["a+{2}", ""],
	["a{99999999999999999999}", ""],
	["a{4294967295}", "u"],
	// groups, names and backreferences
	["(a)(?:b)(?<name>c)\\1\\k<name>", ""],
	["(?<name>a)(?<name>b)", ""],
	["(?<name>a)|(?<name>b)", ""],
	["(?<name>a)|(?<name>b)", "u"],
	["(?:(?<x>a)|(?<x>b))\\k<x>", "u"],
	["(?<x>a)(?:(?<x>b))", "u"],
	["(?<x>a)(?:(?<x>b)|c)", "u"],
	["(?<n>a)\\k<m>", ""],
	["(?<n>a)\\k<m>", "u"],
	["\\k<n>", ""],
	["\\k<n>", "u"],
	["\\k", ""],
	["\\k", "u"],
	["(?<n>a)\\k", ""],
	["(?<\\u{1d4d1}>a)", "u"],
	["(?<\\ud835\\udcd1>a)", ""],
	["(?<\\u{1d4d1}>a)", ""],
	["(?<\\u0041>a)", ""],
	["(?<>a)", ""],
	["(?<1a>a)", ""],
	["(?<a>a", ""],
	["(?<a", ""],
	["(?<a\\>a)", ""],
	["(?<$>a)\\k<$>", ""],
	["(?<_\\u200c>a)", "u"],
	["(a)\\2", ""],
	["(a)\\2", "u"],
	["\\1", ""],
	["\\1", "u"],
	["(a)\\1(b)\\2(c)\\3\\10", ""],
	["(?", ""],
	["(", ""],
	[")", ""],
	["(?i:a)", ""],
	["(?i:a)", "u"],
	["(?ims:a)", "v"],
	["(?-i:a)", "v"],
	["(?i-m:a)", "v"],
	["(?i-i:a)", "v"],
	["(?ii:a)", "v"],
	["(?-:a)", "v"],
	["(?g:a)", "v"],
	["(?i", "v"],
	["(?i:a", "v"],
	// character escapes
	["\\d\\D\\s\\S\\w\\W", ""],
	["\\cA\\cz", ""],
	["\\c1", ""],
	["\\c1", "u"],
	["\\c", ""],
	["\\c", "u"],
	["\\0", ""],
	["\\0", "u"],
	["\\01", ""],
	["\\01", "u"],
	["\\07", ""],
	["\\377\\400", ""],
	["\\8\\9", ""],
	["\\8", "u"],
	["\\x41\\x4", ""],
	["\\x4", "u"],
	["\\u0041\\u004", ""],
	["\\u004", "u"],
	["\\u{41}\\u{1F600}", "u"],
	["\\u{41}", ""],
	["\\u{110000}", "u"],
	["\\u{}", "u"],
	["\\u{", "u"],
	["\\ud83d\\ude00", "u"],
	["\\ud83d", "u"],
	["\\ud83d\\u0041", "u"],
	["\\/\\-\\a\\q", ""],
	["\\-", "u"],
	["\\a", "u"],
	["\\$\\^\\*\\+\\?\\.\\(\\)\\[\\]\\{\\}\\|\\\\\\/", "u"],
	["\\", ""],
	["\\", "u"],
	["\\u{1F600}", "v"],
	// dot and syntax characters
	["a.b", ""],
	["a.b", "s"],
	["*", ""],
	["+", ""],
	["?", ""],
	["|", ""],
	["a|", ""],
	["()", ""],
	["(|)", ""],
	// character classes
	["[abc][^abc][a-z][-a][a-][]", ""],
	["[a-z]", "u"],
	["[z-a]", ""],
	["[z-a]", "u"],
	["[\\d-z]", ""],
	["[\\d-z]", "u"],
	["[a-\\d]", ""],
	["[a-\\d]", "u"],
	["[\\b]", ""],
	["[\\-]", ""],
	["[\\-]", "u"],
	["[\\c_]", ""],
	["[\\c_]", "u"],
	["[\\c1]", ""],
	["[\\01]", ""],
	["[\\01]", "u"],
	["[\\8]", ""],
	["[\\8]", "u"],
	["[a", ""],
	["[a", "u"],
	["[\\ud83d\\ude00-\\ud83d\\ude4f]", "u"],
	["[\\ud83d\\ude00-\\ud83d\\ude4f]", ""],
	["[\\u{1F600}-\\u{1F64F}]", "u"],
	["[\\x41-\\x5a]", "u"],
	["[\\w-a]", ""],
	["[\\w-a]", "u"],
	["[a-\\w]", "u"],
	["[\\s-\\d]", ""],
	// unicode property escapes
	["\\p{L}\\P{L}", "u"],
	["\\p{L}", ""],
	["\\p{Letter}", "u"],
	["\\p{General_Category=Lu}", "u"],
	["\\p{gc=Lu}", "u"],
	["\\p{Script=Greek}", "u"],
	["\\p{sc=Grek}", "u"],
	["\\p{Script_Extensions=Latin}", "u"],
	["\\p{scx=Latn}", "u"],
	["\\p{Script=Kawi}", "u"],
	["\\p{Script=Nag_Mundari}", "u"],
	["\\p{Script=Garay}", "u"],
	["\\p{Script=Todhri}", "u"],
	["\\p{Emoji}", "u"],
	["\\p{Emoji_Presentation}", "u"],
	["\\p{Extended_Pictographic}", "u"],
	["\\p{ID_Compat_Math_Start}", "u"],
	["\\p{Any}\\p{ASCII}\\p{Assigned}", "u"],
	["\\p{Unknown}", "u"],
	["\\p{gc=Unknown}", "u"],
	["\\p{Script=Unknown}", "u"],
	["\\p{Script=}", "u"],
	["\\p{=Lu}", "u"],
	["\\p{}", "u"],
	["\\p{", "u"],
	["\\p", "u"],
	["\\p{L", "u"],
	["\\p{L=}", "u"],
	["\\p{Lu=Lu}", "u"],
	["\\p{Basic_Emoji}", "u"],
	["\\p{Basic_Emoji}", "v"],
	["\\p{RGI_Emoji}", "v"],
	["\\P{RGI_Emoji}", "v"],
	["[^\\p{RGI_Emoji}]", "v"],
	["[\\p{RGI_Emoji}]", "v"],
	["\\p{RGI_Emoji_Flag_Sequence}\\p{Emoji_Keycap_Sequence}", "v"],
	["[\\p{L}]", "u"],
	["[\\P{L}]", "u"],
	["[\\p{L}-a]", "u"],
	["\\p{L}", "v"],
	["(?i:\\P{Lu})", "v"],
	// unicode sets (v flag)
	["[\\p{L}--[a-z]]", "v"],
	["[\\p{L}&&\\p{Lu}]", "v"],
	["[[a-z]--[aeiou]]", "v"],
	["[[a-z]&&[aeiou]]", "v"],
	["[[a-z]--[aeiou]--[xyz]]", "v"],
	["[[a-z]&&[aeiou]&&[a]]", "v"],
	["[[a-z]--[aeiou]&&[a]]", "v"],
	["[[a-z]&&[aeiou]--[a]]", "v"],
	["[a--b]", "v"],
	["[a&&b]", "v"],
	["[a-z--b]", "v"],
	["[[a-z]--b]", "v"],
	["[\\q{abc|def|}]", "v"],
	["[\\q{abc}--\\q{abc}]", "v"],
	["[\\q{a}]", "u"],
	["[^\\q{ab}]", "v"],
	["[^\\q{a}]", "v"],
	["[\\q{ab}]", "v"],
	["[\\q{a\\u{1F600}}]", "v"],
	["[\\q{", "v"],
	["[\\q{a", "v"],
	["[\\q]", "v"],
	["[(]", "v"],
	["[)]", "v"],
	["[{]", "v"],
	["[}]", "v"],
	["[/]", "v"],
	["[-]", "v"],
	["[|]", "v"],
	["[!!]", "v"],
	["[&]", "v"],
	["[&&]", "v"],
	["[a&&&b]", "v"],
	["[a--]", "v"],
	["[--a]", "v"],
	["[a&&]", "v"],
	["[[a-z]", "v"],
	["[[a-z]]]", "v"],
	["[\\&\\-\\!\\#\\%\\,\\:\\;\\<\\=\\>\\@\\`\\~]", "v"],
	["[\\b\\B]", "v"],
	["[\\d-a]", "v"],
	["[a-\\d]", "v"],
	["[\\w&&\\d]", "v"],
	["[\\p{L}&&\\q{abc}]", "v"],
	["[[\\q{abc}]--[\\q{abc}]]", "v"],
	["[\\p{RGI_Emoji}--\\q{x}]", "v"],
	["[^[\\p{RGI_Emoji}]]", "v"],
	["[^[\\q{ab}]]", "v"],
	["[^[a]&&[\\q{ab}]]", "v"],
	["[\\u{1F600}-\\u{1F64F}]", "v"],
	["[z-a]", "v"],
	["[\\q{z}-a]", "v"],
	["[a-\\q{z}]", "v"],
	["\\p{Lowercase}", "v"],
	// annex B syntax in non-unicode mode
	["\\c", ""],
	["[\\c]", ""],
	["\\c-", ""],
	["a{,5}", ""],
	["a{,5}", "u"],
	["\\p{L}", ""],
	["(?=a){2}", ""],
	["(?<=a){2}", ""],
	["\\1(a)", ""],
	["\\10", ""],
	["\\10", "u"],
	["[\\10]", ""],
	["\\z\\Z", ""],
	["\\z", "u"],
	// whole-literal shapes the tokenizer decides
	["a\\/b", ""],
	["[/]", ""],
	["a", "g"],
	["a", "gimsuy"],
	["a", "gimsuyd"],
	["a", "dgimsvy"],
	["a", "uv"],
	["a", "gg"],
	["a", "x"],
	["a", "z"],
	["a", "d"],
	["a", "s"],
	["a", "y"],
	["a", "v"],
	["a", "u"],
	["", ""],
	["(?:)", "g"]
];

/**
 * What a parser makes of a regexp literal: `parsed`, or the error it threw.
 * @param {(source: string, options: { ecmaVersion: import("acorn").ecmaVersion }) => unknown} parse the parser
 * @param {string} source the program text
 * @param {import("acorn").ecmaVersion} ecmaVersion the ecmaVersion to parse at
 * @returns {string} the verdict
 */
const verdictOf = (parse, source, ecmaVersion) => {
	try {
		parse(source, { ecmaVersion });
		return "parsed";
	} catch (err) {
		return /** @type {Error} */ (err).message;
	}
};

describe("RegExpValidator", () => {
	for (const ecmaVersion of ECMA_VERSIONS) {
		it(`rejects and accepts the same patterns as acorn at ecmaVersion ${ecmaVersion}`, () => {
			const differences = [];
			let rejected = 0;
			for (const [pattern, flags] of PATTERNS) {
				const source = `/${pattern}/${flags};`;
				const ours = verdictOf(
					(code, options) => Parser.parse(code, options),
					source,
					ecmaVersion
				);
				const theirs = verdictOf(
					(code, options) => acorn.parse(code, options),
					source,
					ecmaVersion
				);
				if (ours !== theirs) differences.push({ pattern, flags, ours, theirs });
				if (theirs !== "parsed") rejected++;
			}
			expect(differences).toEqual([]);
			// the corpus is meant to exercise the error paths, not only the happy ones
			expect(rejected).toBeGreaterThan(PATTERNS.length / 4);
		});
	}

	it("reports the flag errors before reading the pattern", () => {
		expect(() => Parser.parse("/a/gg;", { ecmaVersion: 2024 })).toThrow(
			/Duplicate regular expression flag/
		);
		expect(() => Parser.parse("/a/x;", { ecmaVersion: 2024 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse("/a/uv;", { ecmaVersion: 2024 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse("/a/v;", { ecmaVersion: 2023 })).toThrow(
			/Invalid regular expression flag/
		);
	});
});
