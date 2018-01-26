it("should move externals in chunks into entry chunk", function(done) {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.containEql("1+" + (1+1));
	source.should.containEql("3+" + (2+2));
	source.should.containEql("5+" + (3+3));

	import("./chunk").then(function(chunk) {
		expect(chunk.default.a).toBe(3);
		chunk.default.b.then(function(chunk2) {
			expect(chunk2.default).toBe(7);
			import("external3").then(function(ex) {
				expect(ex.default).toBe(11);
				done();
			});
		});
	});
});
