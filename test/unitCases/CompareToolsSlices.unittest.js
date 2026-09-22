"use strict";

const { sliceRelation } = require("../../tooling/compare-tools-harness");

/**
 * @param {[string, string, string | null][]} cases `[what, said, reparsed]` for each candidate
 * @returns {{ what: string[], read: number, skipped: number }} what it made of them
 */
const hold = (cases) => {
	const { reports, read, skipped } = sliceRelation(
		cases.map(([what, said, again]) => ({
			what,
			said,
			reparse: () => again
		}))
	);
	return { what: reports.map((report) => report.what), read, skipped };
};

describe("the slice relation", () => {
	it("should report nothing about a node its own source gives back", () => {
		expect(
			hold([["Declaration", "Declaration[0,4) Ident[3,4)", "Declaration[0,4) Ident[3,4)"]])
		).toEqual({ what: [], read: 1, skipped: 0 });
	});

	it("should report a node whose own source parses to something else", () => {
		expect(hold([["Declaration", "Declaration[0,4)", "Declaration[0,5)"]])).toEqual({
			what: ["parses to something else on its own (Declaration)"],
			read: 1,
			skipped: 0
		});
	});

	it("should carry both digests, so the report names what moved", () => {
		const { reports } = sliceRelation([
			{
				what: "YieldExpression",
				said: "YieldExpression[0,5)",
				reparse: () => "Identifier[0,5)"
			}
		]);
		expect(reports[0].repro).toBe("    YieldExpression[0,5)\n      -> Identifier[0,5)");
	});

	it("should count a node no context stands alone rather than report it", () => {
		expect(hold([["YieldExpression", "YieldExpression[0,5)", null]])).toEqual({
			what: [],
			read: 0,
			skipped: 1
		});
	});

	it("should read every candidate, so one finding does not end the sweep", () => {
		expect(
			hold([
				["A", "A[0,1)", "A[0,2)"],
				["B", "B[0,1)", null],
				["C", "C[0,1)", "C[0,1)"],
				["D", "D[0,1)", "D[0,9)"]
			])
		).toEqual({
			what: [
				"parses to something else on its own (A)",
				"parses to something else on its own (D)"
			],
			read: 3,
			skipped: 1
		});
	});
});
