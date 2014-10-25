var window = {};

it("should be able to set the public path", function() {
	window.something = "something";
	__webpack_public_path__ = window.something;
	__webpack_public_path__.should.be.eql("something");
	
	__webpack_public_path__ = "abc";
	__webpack_public_path__.should.be.eql("abc");
	
	__webpack_public_path__ = func();
	__webpack_public_path__.should.be.eql("func");
	
	function func() {
		return "func";
	}
});
