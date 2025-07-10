it("should generate ESM externals when module concatenation is enabled", function () {
	// Test that we can require the built modules
	const testModule = __non_webpack_require__("./test.js");

	// Check that exports are available
	expect(testModule).toBeDefined();

	// Verify exports from test module
	expect(testModule.namedExport1).toBe("named-export-1");
	expect(testModule.namedExport2).toBe("named-export-2");
	expect(testModule.useImports).toBeDefined();
	expect(testModule.reexportedNamespace).toEqual({
		default: "default-export",
		named1: "named-export-1",
		named2: "named-export-2"
	});

	// Call the function to verify imports work
	const result = testModule.useImports();
	expect(result.named1).toBe("named-export-1");
	expect(result.named2).toBe("named-export-2");
	expect(result.ns.default).toBe("default-export");
	expect(result.def).toBe("default-export");
	expect(result.nested.value).toBe("nested-value");
});