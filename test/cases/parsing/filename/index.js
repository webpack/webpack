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

it("should be a string (import.meta.filename)", function() {
	expect(import.meta.filename).toBeTypeOf("string");
	var f = import.meta.filename;
	expect(f).toBeTypeOf("string");
});

it("should be a string (import.meta.dirname)", function() {
	expect(import.meta.dirname).toBeTypeOf("string");
	var d = import.meta.dirname;
	expect(d).toBeTypeOf("string");
});
