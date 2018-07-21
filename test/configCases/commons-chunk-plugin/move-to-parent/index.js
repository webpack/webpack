import "should";

it("should load a moved module", function(done) {
	import("./a")
		.then(a => {
			a.default.should.be.eql("a");
			done();
		})
		.catch(done);
});
