
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
		expect(result.default).toBe("ok")
		if (--pending <= 0) {
			done()
		}
	}
})
