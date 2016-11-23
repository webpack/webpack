it("should handle duplicate chunks", function(done) {
	var firstOne = false, secondOne = false;
	require.ensure([], function(require) {
		require("./acircular");
		require("./duplicate");
		require("./duplicate2");
		firstOne = true;
		if(secondOne) done();
	});
	require.ensure([], function(require) {
		require("./acircular2");
		require("./duplicate");
		require("./duplicate2");
		secondOne = true;
		if(firstOne) done();
	});
});

it("should not load a chunk which is included in a already loaded one", function(done) {
	var async = false;
	require.ensure(["./empty?x", "./empty?y", "./empty?z"], function(require) {
		try {
			async.should.be.eql(true);
			loadChunk();
		} catch(e) { done(e); }
	});
	Promise.resolve().then(function() {}).then(function() {}).then(function() {
		async = true;
	});
	function loadChunk() {
		var sync = true;
		require.ensure(["./empty?x", "./empty?y"], function(require) {
			try {
				sync.should.be.eql(true);
				done();
			} catch(e) { done(e); }
		});
		Promise.resolve().then(function() {}).then(function() {}).then(function() {
			sync = false;
		});
	}
});
