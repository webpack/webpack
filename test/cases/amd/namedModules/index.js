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

define(["named1", "named2"], function(named1, named2) {
	it("should load the named modules in defined dependencies", function() {
		expect(named1).toBe("named1");
		expect(named2).toBe("named2");
	});

	it("should load the named modules in require dependencies", function(done) {
		require(["named3", "named4"], function (named3, named4) {
			expect(named3).toBe("named3");
			expect(named4).toBe("named4");
			done();
		});
	});
});
