it("should load a duplicate module with different dependencies correctly", function(done) {
	var a = require("bundle!./a/file");
	var b = require("bundle!./b/file");
	(typeof a).should.be.eql("function");
	(typeof b).should.be.eql("function");
	a(function(ra) {
		ra.should.be.eql("a");
		b(function(rb) {
			rb.should.be.eql("b");
			done();
		})
	});
});
