"use strict";

const path = require("path");
const record = require("../../tooling/deep-webpack-imports.json");

// What published plugins and loaders require by deep path, collected by
// `yarn find-deep-imports --write`. Entries under `removed` are gone on
// purpose; every other one has to keep resolving.
const LIB_ROOT = path.join(__dirname, "..", "..", "lib");

describe("deep path imports the ecosystem relies on", () => {
	const entries = Object.entries(record.requests)
		.filter(
			([request]) =>
				!Object.prototype.hasOwnProperty.call(record.removed, request)
		)
		.sort(([a], [b]) => a.localeCompare(b));

	it("should have recorded something to check", () => {
		expect(entries.length).toBeGreaterThan(0);
	});

	for (const [request, { weekly, packages }] of entries) {
		it(`should keep "webpack/${request}" resolving (${weekly} weekly, ${packages.length} package(s))`, () => {
			const target = path.join(LIB_ROOT, request.replace(/^lib\//, ""));

			expect(() => require(target)).not.toThrow();
		});
	}
});
