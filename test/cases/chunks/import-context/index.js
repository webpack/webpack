function testCase(load, done) {
	load("two", 2, function() {
		var sync = true;
		load("one", 1, function() {
			sync.should.be.eql(false);
			load("three", 3, function() {
				var sync = true;
				load("two", 2, function() {
					sync.should.be.eql(true);
					done();
				});
				Promise.resolve().then(function() {}).then(function() {}).then(function() {
					sync = false;
				});
			});
		});
		Promise.resolve().then(function() {
			sync = false;
		});
	});
}

it("should be able to use expressions in import", function(done) {
	function load(name, expected, callback) {
		import("./dir/" + name).then(function(result) {
			result.should.be.eql({ default: expected });
			callback();
		}).catch(function(err) {
			done(err);
		});
	}
	testCase(load, done);
});
