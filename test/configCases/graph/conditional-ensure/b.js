import c2 from "./c2";

it("should allow to import an conditionally unneeded chunk", function(done) {
	c2()
		.then(function(c1) {
			return c1.default();
		})
		.then(function(c2_) {
			expect(c2_.value).toBe(2);
			done();
		});
});
