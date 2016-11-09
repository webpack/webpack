var window = {};

it("should be able to set the public path", function() {
	var originalValue = __webpack_public_path__;

	global.xyz = "xyz";
	__webpack_public_path__ = global.xyz;
	__webpack_require__.p.should.be.eql("xyz");
	delete global.xyz;

	window.something = "something";
	__webpack_public_path__ = window.something;
	__webpack_require__.p.should.be.eql("something");
	delete window.something;

	__webpack_public_path__ = "abc";
	__webpack_require__.p.should.be.eql("abc");

	__webpack_public_path__ = func();
	__webpack_require__.p.should.be.eql("func");
	
	__webpack_public_path__ = originalValue;

	function func() {
		return "func";
	}
});
