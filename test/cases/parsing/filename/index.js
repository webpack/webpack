it("should be a string (__filename)", function() {
	__filename.should.be.type("string");
	var f = __filename;
	f.should.be.type("string");
});

it("should be a string (__dirname)", function() {
	__dirname.should.be.type("string");
	var d = __dirname;
	d.should.be.type("string");
});