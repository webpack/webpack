it("should load a duplicate module with different dependencies correctly", function(done) {
	var a = require("bundle-loader!./a/file");
	var b = require("bundle-loader!./b/file");
	expect((typeof a)).toEqual("function");
	expect((typeof b)).toEqual("function");
	a(function(ra) {
		expect(ra).toEqual("a");
		b(function(rb) {
			expect(rb).toEqual("b");
			done();
		})
	});
});
