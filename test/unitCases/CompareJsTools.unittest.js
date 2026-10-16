"use strict";

const CACHE_NAME = "js-tool-comparison";

const installed = jest.fn(() => Promise.resolve(CACHE_NAME));

// The corpus install is the one thing the dispatch must reach without the
// comparison behind it, and a real one would `npm ci` half a gigabyte into a
// contributor's cache — so the harness answers for it here.
jest.mock("../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../tooling/compare-tools-harness"),
	installPackages: installed
}));

const {
	behaviorDifference,
	runMode
} = require("../../tooling/compare-js-tools");

// Read before anything clears the mock: an unguarded script installs while
// being required, and a `beforeEach` would erase exactly that evidence.
const callsWhileRequiring = installed.mock.calls.length;

describe("the JavaScript tool comparison", () => {
	it("should start nothing when the script is required rather than run", () => {
		expect(callsWhileRequiring).toBe(0);
	});

	it("should install the corpus and stop on `--setup`", async () => {
		installed.mockClear();

		await expect(runMode("--setup")).resolves.toBe(CACHE_NAME);

		expect(installed).toHaveBeenCalledTimes(1);
		expect(installed).toHaveBeenCalledWith(CACHE_NAME);
	});
});

describe("the behavior relation", () => {
	it("should report a printed script printing otherwise than its source", () => {
		const [report] = /** @type {import("../../tooling/compare-tools-harness").Report[]} */ (
			behaviorDifference("console.log((1, 2));", "console.log(1,2);")
		);

		expect(report.relation).toBe("behavior");
		expect(report.repro).toContain("2");
		expect(report.repro).toContain("1 2");
	});

	it("should report a printed script throwing otherwise", () => {
		const reports = behaviorDifference("var a = {};", "var a; a.b.c;");

		expect(reports).toHaveLength(1);
		expect(
			/** @type {import("../../tooling/compare-tools-harness").Report[]} */ (
				reports
			)[0].repro
		).toContain("threw <TypeError>");
		expect(
			/** @type {import("../../tooling/compare-tools-harness").Report[]} */ (
				behaviorDifference("var a;", "throw 1;")
			)[0].repro
		).toContain("threw <number>");
	});

	it("should find nothing where the printed script runs the same", () => {
		expect(
			behaviorDifference(
				"function f() {} console.log(f, typeof f);",
				"function f(){}console.log(f,typeof f);"
			)
		).toEqual([]);
	});

	it("should run a script reading the clock or a random number on fixed ones", () => {
		const source =
			"console.log(Math.random(), Date.now(), new Date().getTime(), Date());";

		expect(behaviorDifference(source, source)).toEqual([]);
		expect(
			behaviorDifference(source, "console.log(Math.random());")
		).toHaveLength(1);
	});

	it("should report a printed script that times out", () => {
		const [report] = /** @type {import("../../tooling/compare-tools-harness").Report[]} */ (
			behaviorDifference("console.log(1);", "for (;;) {}")
		);

		expect(report.what).toBe("times out");
		expect(report.repro).toContain("<timeout>");
	});

	it("should not run a script that loops or is too long", () => {
		expect(behaviorDifference("for (;;) {}", "")).toBeNull();
		expect(behaviorDifference(`/*${" ".repeat(20000)}*/`, "")).toBeNull();
	});
});
