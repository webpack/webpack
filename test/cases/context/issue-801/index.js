it("should emit valid code for dynamic require string with expr", function() {
	var test = require("./folder/file");
	test("file").should.be.eql({ a: false, b: false, c: true, d: true });
	test("file.js").should.be.eql({ a: false, b: false, c: false, d: true });
	test("./file").should.be.eql({ a: true, b: true, c: false, d: false });
	test("./file.js").should.be.eql({ a: false, b: false, c: false, d: false });
});