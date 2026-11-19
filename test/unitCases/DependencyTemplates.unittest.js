"use strict";

const DependencyTemplates = require("../../lib/template/DependencyTemplates");

describe("DependencyTemplates", () => {
	describe("importBindingScopes", () => {
		it("records nothing until a devtool asks for it", () => {
			expect(new DependencyTemplates("xxhash64").importBindingScopes).toBe(false);
		});

		it("carries the request through a clone", () => {
			const dependencyTemplates = new DependencyTemplates("xxhash64");
			dependencyTemplates.importBindingScopes = true;

			expect(dependencyTemplates.clone().importBindingScopes).toBe(true);
		});
	});
});
