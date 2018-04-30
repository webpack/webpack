it("should have correct properties on the require function", function() {
	__webpack_require__.c.should.have.type("object");
	__webpack_require__.m.should.have.type("object");
	__webpack_require__.p.should.have.type("string");
});