it("should compile and run", () => {
	expect(lib1Exports.default).toBe('disable-provided-export');
	expect(lib1Exports.foo).toBe(true);
	expect(lib1Exports.React).toBe(undefined);

	expect(lib2Exports._default).toBe('disable-provided-export');
});


