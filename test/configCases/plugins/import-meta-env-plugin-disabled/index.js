it("should not replace import.meta.env when disabled", () => {
	// When importMetaEnv is disabled, import.meta.env should not be replaced
	// This test verifies that the parser option works correctly
	
	// process.env should still work
	expect(process.env.TEST_VAR).toBe("test-value");
	
	// import.meta.env should be undefined or not replaced
	expect(typeof import.meta.env).toBe("undefined");
});

