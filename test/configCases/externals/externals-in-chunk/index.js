it("should move externals in chunks into entry chunk", function(done) {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.containEql("1+" + (1+1));
	source.should.containEql("3+" + (2+2));
	source.should.containEql("5+" + (3+3));

	import("./chunk").then(function(chunk) {
		chunk.a.should.be.eql(3);
		chunk.b.then(function(chunk2) {
			chunk2.should.be.eql(7);
			import("external3").then(function(ex) {
				ex.should.be.eql(11);
				done();
			});
		});
	});
});
