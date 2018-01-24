"use strict";

const NullDependency = require("../lib/dependencies/NullDependency");

describe("NullDependency", () => {
	describe("when created", () => {
		it("has a null type", () => {
			const nullDependency = new NullDependency();
			expect(nullDependency.type).toBe("null");
		});
	});
});
