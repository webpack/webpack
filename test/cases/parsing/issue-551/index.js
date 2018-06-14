var window = {};

it("should be able to set the public path", function() {
	var originalValue = __webpack_public_path__;

	global.xyz = "xyz";
	__webpack_public_path__ = global.xyz;
	expect(__webpack_require__.p).toBe("xyz");
	delete global.xyz;

	window.something = "something";
	__webpack_public_path__ = window.something;
	expect(__webpack_require__.p).toBe("something");
	delete window.something;

	__webpack_public_path__ = "abc";
	expect(__webpack_require__.p).toBe("abc");

	__webpack_public_path__ = func();
	expect(__webpack_require__.p).toBe("func");

	__webpack_public_path__ = originalValue;

	function func() {
		return "func";
	}
});
