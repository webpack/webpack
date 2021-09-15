it("should be a string (__filename)", function() {
	expect(__filename).toBeTypeOf("string");
	var f = __filename;
	expect(f).toBeTypeOf("string");
});

it("should be a string (__dirname)", function() {
	expect(__dirname).toBeTypeOf("string");
	var d = __dirname;
	expect(d).toBeTypeOf("string");
});
