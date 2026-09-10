"use strict";

// The size report's row keys and baseline check. `CodeSizeTestCases.size.js`
// runs a full build on require, so both are unit-tested through their helpers.

const codeSizeBaselineDrift = require("./helpers/codeSizeBaselineDrift");
const codeSizeInputChanges = require("./helpers/codeSizeInputChanges");
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

describe("codeSizeInputChanges", () => {
	/**
	 * @param {number} modules how many modules the case built
	 * @param {number} bytes how much source they carried
	 * @param {string=} digest what that source hashed to
	 * @returns {{ modules: number, bytes: number, digest: string }} the input record
	 */
	const input = (modules, bytes, digest = `${modules}:${bytes}`) => ({
		modules,
		bytes,
		digest
	});

	it("says nothing when every case was handed the same source", () => {
		const before = { "a/b": input(2, 100), "c/d": input(1, 50) };
		expect(codeSizeInputChanges(before, { ...before })).toEqual({
			cases: new Set(),
			bytes: 0,
			modules: 0
		});
	});

	it("names the cases whose source moved, and by how much", () => {
		const changes = codeSizeInputChanges(
			{ "a/b": input(2, 100), "c/d": input(1, 50) },
			{ "a/b": input(2, 140), "c/d": input(1, 50) }
		);
		expect(changes.cases).toEqual(new Set(["a/b"]));
		expect(changes.bytes).toBe(40);
		expect(changes.modules).toBe(0);
	});

	it("counts an edit that kept the case's size as rebuilt", () => {
		// A renamed symbol or two swapped lines moves neither total, and the report
		// would otherwise credit webpack with what the edit did to the bundle.
		const changes = codeSizeInputChanges(
			{ "a/b": input(1, 100, "before") },
			{ "a/b": input(1, 100, "after") }
		);
		expect(changes.cases).toEqual(new Set(["a/b"]));
		expect(changes.bytes).toBe(0);
		expect(changes.modules).toBe(0);
	});

	it("counts a case that gained a module as rebuilt", () => {
		const changes = codeSizeInputChanges(
			{ "a/b": input(1, 100) },
			{ "a/b": input(2, 100) }
		);
		expect(changes.cases).toEqual(new Set(["a/b"]));
		expect(changes.modules).toBe(1);
	});

	it("leaves a case only one run builds out of it", () => {
		// Its assets are reported as new or gone, which is a size and not a delta,
		// so there is no input delta to attribute them to either.
		const changes = codeSizeInputChanges(
			{ "gone/case": input(1, 10) },
			{ "new/case": input(1, 10) }
		);
		expect(changes).toEqual({ cases: new Set(), bytes: 0, modules: 0 });
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
