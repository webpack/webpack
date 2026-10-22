
it("should parse template strings in amd requires", function(done) {
	var name = "abc";
	var suffix = "Test";

	var pending = [
		require([`./abc/abcTest`], test),
		require([`./abc/${name}Test`], test),
		require([`./${name}/${name}Test`], test),
		require([`./abc/${name}${suffix}`], test),
		require([String.raw`./${name}/${name}${suffix}`], test)
	].length;

	function test (result) {
		expect(result.default).toEqual("ok")
		if (--pending <= 0) {
			done()
		}
	}
})

it("should parse .concat strings in amd requires", function(done) {
	var name = "abc";
	var suffix = "Test";

	var pending = [
		require(["./abc/abcTest"], test),
		require(["./abc/".concat(name, "Test")], test),
		require(["./".concat(name, "/").concat(name, "Test")], test),
		require(["./abc/".concat(name).concat(suffix)], test)
	].length;

	function test (result) {
		expect(result.default).toEqual("ok")
		if (--pending <= 0) {
			done()
		}
	}
})
