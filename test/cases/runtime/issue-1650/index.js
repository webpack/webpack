it("should be able to set the public path globally", function() {
	var org = __webpack_public_path__;
	require("./file");
	__webpack_public_path__.should.be.eql("ok");
	__webpack_public_path__ = org;
});
