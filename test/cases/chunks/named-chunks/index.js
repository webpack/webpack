it("should handle named chunks", function(done) {
	var sync = false;
	require.ensure([], function(require) {
		require("./empty?a");
		require("./empty?b");
		testLoad();
		sync = true;
		process.nextTick(function() {
			sync = false;
		});
	}, "named-chunk");
	function testLoad() {
		require.ensure([], function(require) {
			require("./empty?c");
			require("./empty?d");
			sync.should.be.ok();
			done();
		}, "named-chunk");
	}
});

it("should handle empty named chunks", function(done) {
	var sync = false;
	require.ensure([], function(require) {
		sync.should.be.ok();
	}, "empty-named-chunk");
	require.ensure([], function(require) {
		sync.should.be.ok();
		done();
	}, "empty-named-chunk");
	sync = true;
	setImmediate(function() {
		sync = false;
	});
});
