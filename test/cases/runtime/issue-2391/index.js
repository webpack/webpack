it("should not have a require.onError function by default", function() {
	expect((typeof require.onError)).toEqual("undefined"); // expected to fail in browsertests
});