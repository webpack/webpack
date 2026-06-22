it("should emit an asset with an absolute path without crashing (#12759)", () => {
	// Verification happens in the plugin's afterEmit hook; reaching here without
	// a compilation error means the absolute asset was written successfully.
	expect(true).toBe(true);
});
