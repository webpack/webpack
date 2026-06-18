// "import.meta" appears only in a string and a comment (not as syntax: import.meta),
// so the module is NOT detected as an ES module — it stays sloppy CommonJS.
const marker = "import.meta";

function getThis() {
	return this;
}

it("should not treat a string/comment 'import.meta' as an ES module", () => {
	expect(marker).toBe("import.meta");
	// Sloppy CommonJS: a plain call's `this` is defined (would be undefined in ESM).
	expect(getThis()).not.toBe(undefined);
	expect(typeof require).toBe("function");
});
