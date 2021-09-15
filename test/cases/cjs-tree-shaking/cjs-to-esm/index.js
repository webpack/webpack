it("should allow to require esm", () => {
	expect(require("./module?1").abc).toBe("abc");
	expect(typeof require("./module?2").func).toBe("function");
	// check if a function called with a namespace object as context
	// still yield the same optimization, compared to only accessing
	// the export
	expect(Object.keys(require("./module?3").func())).toEqual(
		Object.keys(require.cache[require.resolve("./module?2")].exports)
	);
});
