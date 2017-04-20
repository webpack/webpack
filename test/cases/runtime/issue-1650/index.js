it("should be able to set the public path globally", function() {
	var org = __webpack_public_path__;
	require("./file");
	expect(__webpack_public_path__).toEqual("ok");
	__webpack_public_path__ = org;
});
