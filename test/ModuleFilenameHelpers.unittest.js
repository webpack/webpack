"use strict";

const ModuleFilenameHelpers = require("../lib/ModuleFilenameHelpers");

describe("ModuleFilenameHelpers", () => {
	describe("matchPart", () => {
		it("should return true when no test is given", () => {
			expect(ModuleFilenameHelpers.matchPart("foo.js", undefined)).toBe(true);
		});

		it("should match string tests as a prefix, not a glob", () => {
			expect(ModuleFilenameHelpers.matchPart("foo.js", "foo")).toBe(true);
			expect(ModuleFilenameHelpers.matchPart("foo.js", "foo.js")).toBe(true);
			// "foo." is a literal prefix of "foo.js", so this matches
			expect(ModuleFilenameHelpers.matchPart("foo.js", "foo.")).toBe(true);
			// "*" has no special meaning for string tests, it's matched literally
			expect(ModuleFilenameHelpers.matchPart("foo.js", "foo*")).toBe(false);
			expect(ModuleFilenameHelpers.matchPart("foo.js", "foo.*")).toBe(false);
		});

		it("should match RegExp tests", () => {
			expect(ModuleFilenameHelpers.matchPart("foo.js", /^foo/)).toBe(true);
			expect(ModuleFilenameHelpers.matchPart("foo.js", /\.js$/)).toBe(true);
			expect(ModuleFilenameHelpers.matchPart("foo.js", /^bar/)).toBe(false);
		});

		it("should match if any item in an array matches", () => {
			expect(ModuleFilenameHelpers.matchPart("foo.js", [/^foo/, "bar"])).toBe(
				true
			);
			expect(ModuleFilenameHelpers.matchPart("foo.js", [/^baz/, /^bar/])).toBe(
				false
			);
		});
	});

	describe("matchObject", () => {
		it("should not filter by extension for a string test", () => {
			// documented as matching modules "based on their extension",
			// but a string test only matches a literal prefix
			expect(ModuleFilenameHelpers.matchObject({ test: ".js" }, "foo.js")).toBe(
				false
			);
			expect(
				ModuleFilenameHelpers.matchObject({ test: /\.js$/ }, "foo.js")
			).toBe(true);
		});

		it("should respect include/exclude", () => {
			expect(
				ModuleFilenameHelpers.matchObject({ include: "foo" }, "foo.js")
			).toBe(true);
			expect(
				ModuleFilenameHelpers.matchObject({ exclude: "foo" }, "foo.js")
			).toBe(false);
		});
	});
});
