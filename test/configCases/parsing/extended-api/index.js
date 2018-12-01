it("should have __webpack_hash__", function() {
	expect(__webpack_hash__).toBeTypeOf("string");
	expect(__webpack_hash__).toMatch(/^[0-9a-f]{20}$/);
	return import("./chunk").then(({ hash }) => {
		expect(hash).toBe(__webpack_hash__);
	});
});
it("should have __webpack_chunkname__", function() {
	expect(__webpack_chunkname__).toBeTypeOf("string");
	expect(__webpack_chunkname__).toBe("other");
	return import("./chunk").then(({ chunkName }) => {
		expect(chunkName).toBe(__webpack_chunkname__);
	});
});
