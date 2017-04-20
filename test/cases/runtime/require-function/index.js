it("should have correct properties on the require function", function() {
	expect(typeof __webpack_require__.c).toBe("object");
	expect(typeof __webpack_require__.m).toBe("object");
	expect(typeof __webpack_require__.p).toBe("string");
});