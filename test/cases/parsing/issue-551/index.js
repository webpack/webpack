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

it("should be able to set the public path function", function() {
	var originalValue = __webpack_public_path_function__;

	global.xyz = "xyz";
	__webpack_public_path_function__ = global.xyz;
	expect(__webpack_require__.P).toBe("xyz");
	delete global.xyz;

	window.something = "something";
	__webpack_public_path_function__ = window.something;
	expect(__webpack_require__.P).toBe("something");
	delete window.something;

	__webpack_public_path_function__ = "abc";
	expect(__webpack_require__.P).toBe("abc");

	__webpack_public_path_function__ = func();
	expect(__webpack_require__.P).toBe("func");

	__webpack_public_path_function__ = originalValue;

	function func() {
		return "func";
	}
});
