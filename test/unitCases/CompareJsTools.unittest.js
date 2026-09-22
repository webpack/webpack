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

const { runMode } = require("../../tooling/compare-js-tools");

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
