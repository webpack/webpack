"use strict";

// The size report's row keys. `CodeSizeTestCases.size.js` runs a full build on
// require, so the key assignment is unit-tested through its helper.

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
