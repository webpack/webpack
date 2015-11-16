it("should be able to use expressions in System.import", function(done) {
	function load(name, expected, callback) {
		System.import("./dir/" + name).then(function(result) {
			result.should.be.eql(expected);
			callback();
		}).catch(function(err) {
			done(err);
		});
	}
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
				setImmediate(function() {
					sync = false;
				});
			});
		});
		setImmediate(function() {
			sync = false;
		});
	});
});
