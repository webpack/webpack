"use strict";

// The size report's row keys and baseline check. `CodeSizeTestCases.size.js`
// runs a full build on require, so both are unit-tested through their helpers.

const codeSizeBaselineDrift = require("./helpers/codeSizeBaselineDrift");
const codeSizeReportPrefixes = require("./helpers/codeSizeReportPrefixes");

describe("codeSizeReportPrefixes", () => {
	it("gives a lone compiler no prefix", () => {
		expect(codeSizeReportPrefixes(["only"])).toEqual([""]);
		expect(codeSizeReportPrefixes([undefined])).toEqual([""]);
	});

	it("keeps the plain name when every name is distinct", () => {
		expect(codeSizeReportPrefixes(["a", "b"])).toEqual(["a/", "b/"]);
	});

	it("falls back to the index for an unnamed compiler", () => {
		expect(codeSizeReportPrefixes([undefined, "b"])).toEqual(["0/", "b/"]);
	});

	it("indexes only the names that repeat", () => {
		expect(codeSizeReportPrefixes(["a", "a", "a", "b"])).toEqual([
			"a[0]/",
			"a[1]/",
			"a[2]/",
			"b/"
		]);
	});

	it("collides a name with the index an unnamed compiler falls back to", () => {
		// `"1"` and the number `1` render the one prefix, so both take an index.
		expect(codeSizeReportPrefixes(["1", undefined])).toEqual([
			"1[0]/",
			"1[1]/"
		]);
	});

	it("widens a key a configured name already spells", () => {
		// The second `foo` wants `foo[1]/`, which is the third compiler's name.
		expect(codeSizeReportPrefixes(["foo", "foo", "foo[1]"])).toEqual([
			"foo[0]/",
			"foo[1]/",
			"foo[1][2]/"
		]);
		expect(codeSizeReportPrefixes(["foo[0]", "foo", "foo"])).toEqual([
			"foo[0]/",
			"foo[1]/",
			"foo[2]/"
		]);
	});

	it("never repeats a key", () => {
		const names = ["a", "a", "a[1]", "a[1]", "a[1][3]", undefined, "5", "a"];
		const prefixes = codeSizeReportPrefixes(names);
		expect(new Set(prefixes).size).toBe(names.length);
	});
});

describe("codeSizeBaselineDrift", () => {
	const base = "e3f177ca7e9c645718d1dbe95bf3c6f60563f6e8";
	const older = "a0b6a75e1c0d3f4a5b6c7d8e9f0a1b2c3d4e5f60";

	it("says nothing when the baseline is the measured base", () => {
		expect(codeSizeBaselineDrift(base, base)).toBeUndefined();
	});

	it("says nothing when either commit is unknown", () => {
		// A `main` push has no base, and a baseline predating `meta.commit` has no
		// commit — neither is drift, so neither warns.
		expect(codeSizeBaselineDrift(base, undefined)).toBeUndefined();
		expect(codeSizeBaselineDrift(undefined, base)).toBeUndefined();
		expect(codeSizeBaselineDrift(undefined, undefined)).toBeUndefined();
	});

	it("names both commits when they differ", () => {
		const note = codeSizeBaselineDrift(older, base);
		expect(note).toContain("a0b6a75");
		expect(note).toContain("e3f177c");
		expect(note).toContain("[!WARNING]");
	});
});
