it("should have __webpack_hash__", function() {
	(typeof __webpack_hash__).should.be.type("string");
	__webpack_hash__.should.match(/^[0-9a-f]{20}$/);
});
it("should have __webpack_chunkname__", function() {
	(typeof __webpack_chunkname__).should.be.type("string");
	__webpack_chunkname__.should.be.eql('other');
});
