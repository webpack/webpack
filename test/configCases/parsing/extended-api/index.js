it("should have __webpack_hash__", function() {
	expect(__webpack_hash__).toBeTypeOf("string");
	expect(__webpack_hash__).toMatch(/^[0-9a-f]{20}$/);
});
it("should have __webpack_chunkname__", function() {
	expect(__webpack_chunkname__).toBeTypeOf("string");
	expect(__webpack_chunkname__).toBe("other");
});
