it("should load module-import external from dynamic chunk", function (done) {
	// Verify the dynamic import works - the external-lib (mapped to node:fs)
	// should be correctly available in the dynamically loaded chunk
	import("./chunk").then(function (chunk) {
		expect(chunk.default).toBe("dynamic chunk loaded");
		done();
	});
});
