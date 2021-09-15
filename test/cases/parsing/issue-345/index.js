it("should parse multiple expressions in a require", function(done) {
	var name = "abc";
	require(["./" + name + "/" + name + "Test"], function(x) {
		expect(x).toBe("ok");
		done();
	});
});
