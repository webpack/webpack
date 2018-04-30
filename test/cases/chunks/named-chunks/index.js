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

it("should handle named chunks when there is an error callback", function(done) {
	var sync = false;
	require.ensure([], function(require) {
		require("./empty?e");
		require("./empty?f");
		testLoad();
		sync = true;
		process.nextTick(function() {
			sync = false;
		});
	}, function(error) {}, "named-chunk-for-error-callback");
	function testLoad() {
		require.ensure([], function(require) {
			require("./empty?g");
			require("./empty?h");
			sync.should.be.ok();
			done();
		}, function(error) {}, "named-chunk-for-error-callback");
	}
});

it("should handle empty named chunks when there is an error callback", function(done) {
	var sync = false;
	require.ensure([], function(require) {
		sync.should.be.ok();
	}, function(error) {}, "empty-named-chunk-for-error-callback");
	require.ensure([], function(require) {
		sync.should.be.ok();
		done();
	}, function(error) {}, "empty-named-chunk-for-error-callback");
	sync = true;
	setImmediate(function() {
		sync = false;
	});
});

it("should be able to use named chunks in import()", function(done) {
	var sync = false;
	import("./empty?import1-in-chunk1" /* webpackChunkName: "import-named-chunk-1" */).then(function(result){
		var i = 0;
		import("./empty?import2-in-chunk1" /* webpackChunkName: "import-named-chunk-1" */).then(function(result){
			sync.should.be.ok();
			if(i++ > 0) done();
		}).catch(function(err){
			done(err);
		});
		import("./empty?import3-in-chunk2" /* webpackChunkName: "import-named-chunk-2" */).then(function(result){
			sync.should.not.be.ok();
			if(i++ > 0) done();
		}).catch(function(err){
			done(err);
		});
		sync = true;
		Promise.resolve().then(function(){}).then(function(){}).then(function(){
			sync = false;
		});
	});
});

it("should be able to use named chunk in context import()", function(done) {
	var mpty = "mpty";
	var sync = false;
	import("./e" + mpty + "2" /* webpackChunkName: "context-named-chunk" */).then(function(result) {
		var i = 0;
		import("./e" + mpty + "3" /* webpackChunkName: "context-named-chunk" */).then(function(result){
			sync.should.be.ok();
			if(i++ > 0) done();
		}).catch(function(err){
			done(err);
		});
		import("./e" + mpty + "4" /* webpackChunkName: "context-named-chunk-2" */).then(function(result){
			sync.should.not.be.ok();
			if(i++ > 0) done();
		}).catch(function(err){
			done(err);
		});
		sync = true;
		Promise.resolve().then(function(){}).then(function(){}).then(function(){
			sync = false;
		});
	});
});
