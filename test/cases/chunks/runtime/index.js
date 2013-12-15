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
		async.should.be.eql(true);
		loadChunk();
	});
	async = true;
	function loadChunk() {
		var sync = true;
		require.ensure(["./empty?x", "./empty?y"], function(require) {
			sync.should.be.eql(true);
			done();
		});
		sync = false;
	}
});
