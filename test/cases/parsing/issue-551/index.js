var window = {};

it("should be able to set the public path", function() {
	global.xyz = "xyz";
	__webpack_public_path__ = global.xyz;
	__webpack_require__.p.should.be.eql("xyz");

	window.something = "something";
	__webpack_public_path__ = window.something;
	__webpack_require__.p.should.be.eql("something");

	__webpack_public_path__ = "abc";
	__webpack_require__.p.should.be.eql("abc");

	__webpack_public_path__ = func();
	__webpack_require__.p.should.be.eql("func");

	function func() {
		return "func";
	}
});
