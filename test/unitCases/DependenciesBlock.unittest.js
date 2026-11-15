"use strict";

const AsyncDependenciesBlock = require("../../lib/graph/AsyncDependenciesBlock");
const DependenciesBlock = require("../../lib/graph/DependenciesBlock");

describe("DependenciesBlock", () => {
	describe("isAsyncBlock", () => {
		it("returns false for a plain block", () => {
			expect(new DependenciesBlock().isAsyncBlock()).toBe(false);
		});

		it("returns true for an async block", () => {
			expect(new AsyncDependenciesBlock(null).isAsyncBlock()).toBe(true);
		});
	});
});
