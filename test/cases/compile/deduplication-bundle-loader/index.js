it("should load a duplicate module with different dependencies correctly", function(done) {
	var a = require("bundle-loader!./a/file");
	var b = require("bundle-loader!./b/file");
	expect((typeof a)).toBe("function");
	expect((typeof b)).toBe("function");
	a(function(ra) {
		expect(ra).toBe("a");
		b(function(rb) {
			expect(rb).toBe("b");
			done();
		})
	});
});
