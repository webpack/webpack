it("should be a string (__filename)", function() {
	expect(typeof __filename).toBe('string');
	var f = __filename;
	expect(typeof f).toBe("string");
});

it("should be a string (__dirname)", function() {
	expect(typeof __dirname).toBe('string');
	var d = __dirname;
	expect(typeof d).toBe("string");
});