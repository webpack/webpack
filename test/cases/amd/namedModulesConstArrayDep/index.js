define("named1", [], function() {
	return "named1";
});

define("named2", [], function() {
	return "named2";
});

define("named3", [], function() {
	return "named3";
});

define("named4", [], function() {
	return "named4";
});

define("named1,named2".split(","), function(named1, named2) {
	it("should load the named modules in const array defined dependencies", function() {
		named1.should.be.eql("named1");
		named2.should.be.eql("named2");
	});

	it("should load the named modules in const array require dependencies", function(done) {
		require("named3,named4".split(","), function (named3, named4) {
			named3.should.be.eql("named3");
			named4.should.be.eql("named4");
			done();
		});
	});
});
