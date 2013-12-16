it("should have correct properties on the require function", function() {
	__webpack_require__.cache.should.have.type("object");
	__webpack_require__.modules.should.have.type("object");
	__webpack_require__.p.should.have.type("string");
});