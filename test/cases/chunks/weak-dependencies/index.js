it("should not include a module with a weak dependency", function() {
	var a = !!__webpack_modules__[require.resolveWeak("./a")];
	var b = !!__webpack_modules__[require.resolve("./b")];
	var c = !!__webpack_modules__[require.resolveWeak("./c")];
	var d = !!__webpack_modules__[require.resolveWeak("./d")];
	require(["./c"]);
	require("./d");

	expect(a).toEqual(false);
	expect(b).toEqual(true);
	expect(c).toEqual(false);
	expect(d).toEqual(true);
});