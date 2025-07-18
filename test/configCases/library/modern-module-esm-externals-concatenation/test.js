it("should generate ESM externals when module concatenation is enabled", function () {
	// Test that we can require the built modules
	const testModule = __non_webpack_require__("./test.js");
	const mainModule = __non_webpack_require__("./main.js");

	// Check that exports are available
	expect(testModule).toBeDefined();
	expect(mainModule).toBeDefined();

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


	// Test selective exports
	expect(mainModule.useSelectiveExports).toBeDefined();
	expect(mainModule.getUnusedNamespace).toBeDefined();

	// Test selective export usage
	const selective = mainModule.useSelectiveExports();
	expect(selective.used).toBe("used-export");

	// Test unused namespace
	const unusedNs = mainModule.getUnusedNamespace();
	expect(unusedNs).toBeDefined();
	expect(unusedNs.default).toBe("totally-unused-default");
	expect(unusedNs.export1).toBe("totally-unused-1");

	// Test array exports
	expect(mainModule.useArrayExports).toBeDefined();
	expect(mainModule.nestedReexport).toBeDefined();

	// Test array export handling
	const arrayResult = mainModule.useArrayExports();
	expect(arrayResult.directNested).toBeDefined();
	expect(arrayResult.directNested.value).toBe("nested-value");
	expect(arrayResult.nestedValue).toBe("nested-value");

	// Test nested reexport
	const nestedReexport = mainModule.nestedReexport;
	expect(nestedReexport).toBeDefined();
	expect(nestedReexport.value).toBe("nested-value");
});