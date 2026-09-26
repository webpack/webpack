"use strict";

const DependencyTemplates = require("../../lib/template/DependencyTemplates");

describe("DependencyTemplates", () => {
	describe("enableImportBindingScopes", () => {
		it("records nothing until a devtool asks for it", () => {
			expect(new DependencyTemplates().importBindingScopes).toBe(false);
		});

		it("moves the code generation cache key, so a build without scopes is not reused", () => {
			const dependencyTemplates = new DependencyTemplates();
			const before = dependencyTemplates.getHash();
			dependencyTemplates.enableImportBindingScopes();

			expect(dependencyTemplates.importBindingScopes).toBe(true);
			expect(dependencyTemplates.getHash()).not.toBe(before);
		});

		it("carries the request through a clone", () => {
			const dependencyTemplates = new DependencyTemplates();
			dependencyTemplates.enableImportBindingScopes();

			expect(dependencyTemplates.clone().importBindingScopes).toBe(true);
		});
	});
});
