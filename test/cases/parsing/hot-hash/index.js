if(module.hot) {
	it("should have __webpack_hash__", function() {
		expect(typeof __webpack_hash__).toBeTypeOf("string");
		expect(__webpack_hash__).toMatch(/^[0-9a-f]{16}$/);
	});
} else {
	it("should have __webpack_hash__ (disabled)", function() {
	});
}
