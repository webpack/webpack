"use strict";

const { applyWebpackOptionsDefaults, getNormalizedWebpackOptions } =
	require("..").config;

/**
 * @param {EXPECTED_ANY} target target option
 * @returns {EXPECTED_ANY} resolved platform target properties
 */
const getPlatform = (target) => {
	const normalized = getNormalizedWebpackOptions(
		/** @type {EXPECTED_ANY} */ ({ target })
	);
	return applyWebpackOptionsDefaults(/** @type {EXPECTED_ANY} */ (normalized))
		.platform;
};

describe("platform", () => {
	describe("universal", () => {
		it("is true for the universal target", () => {
			expect(getPlatform("universal").universal).toBe(true);
		});

		it('is true for the ["web", "node"] target', () => {
			expect(getPlatform(["web", "node"]).universal).toBe(true);
		});

		it("is true when the array target also spans a worker", () => {
			expect(getPlatform(["web", "node", "webworker"]).universal).toBe(true);
		});

		it('is true for the ["webworker", "node"] target (worker is web)', () => {
			expect(getPlatform(["webworker", "node"]).universal).toBe(true);
		});

		it("is false for a web-only target", () => {
			expect(getPlatform("web").universal).toBe(false);
		});

		it("is false for a node-only target", () => {
			expect(getPlatform("node").universal).toBe(false);
		});
	});
});
