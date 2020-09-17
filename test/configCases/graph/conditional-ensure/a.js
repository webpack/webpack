import c1 from "./c1";

it("should allow to import an conditionally unneeded chunk", function(done) {
	c1()
		.then(function(c2) {
			return c2.default();
		})
		.then(function(c1_) {
			expect(c1_.value).toBe(1);
			done();
		});
});
