it("should move externals in chunks into entry chunk", function(done) {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.containEql("1+" + (1+1));
	source.should.containEql("3+" + (2+2));
	source.should.containEql("5+" + (3+3));

	import("./chunk").then(function(chunk) {
		chunk.default.a.should.be.eql(3);
		chunk.default.b.then(function(chunk2) {
			chunk2.default.should.be.eql(7);
			import("external3").then(function(ex) {
				ex.default.should.be.eql(11);
				done();
			});
		});
	});
});
