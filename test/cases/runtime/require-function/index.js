it("should have correct properties on the require function", function() {
	expect(__webpack_require__.c).toBeTypeOf("object");
	expect(__webpack_require__.m).toBeTypeOf("object");
	expect(__webpack_require__.p).toBeTypeOf("string");
});
