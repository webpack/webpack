"use strict";

// Ported from rspack's compiler case for this option: the same values are
// refused, so a configuration either bundler accepts the other does too.

const SplitChunksPlugin = require("../../lib/optimize/SplitChunksPlugin");
const webpack = require("../../lib/webpack");

const MESSAGE =
	'"optimization.splitChunks.dedupDepth" must be an integer between 0 and 4294967295.';

describe("optimization.splitChunks.dedupDepth", () => {
	// The schema refuses what it can read off the value alone; the plugin refuses
	// the rest, which is also what a plugin constructed by hand is held to.
	for (const dedupDepth of [1.5, Number.NaN, Number.POSITIVE_INFINITY, 0x100000000]) {
		it(`should refuse ${String(dedupDepth)}`, () => {
			expect(
				() => new SplitChunksPlugin({ dedupDepth })
			).toThrowErrorMatchingInlineSnapshot(
				`"\\"optimization.splitChunks.dedupDepth\\" must be an integer between 0 and 4294967295."`
			);
		});
	}

	for (const dedupDepth of [-1, "2", null]) {
		it(`should refuse ${String(dedupDepth)} by the schema`, () => {
			let error;
			try {
				webpack({
					entry: "./entry",
					optimization: {
						splitChunks: {
							dedupDepth: /** @type {EXPECTED_ANY} */ (dedupDepth)
						}
					}
				});
			} catch (err) {
				error = err;
			}
			expect(/** @type {Error} */ (error).name).toBe("ValidationError");
			expect(/** @type {Error} */ (error).message).toContain(
				"optimization.splitChunks.dedupDepth"
			);
		});
	}

	for (const dedupDepth of [0, 1, 2, 0xffffffff]) {
		it(`should accept ${dedupDepth}`, () => {
			expect(() => new SplitChunksPlugin({ dedupDepth })).not.toThrow();
		});
	}

	it("should state the range it takes", () => {
		expect(() => new SplitChunksPlugin({ dedupDepth: -1 })).toThrow(MESSAGE);
	});
});
