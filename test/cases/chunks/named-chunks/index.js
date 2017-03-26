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

it("should be able to use named chunks in import()", function(done) {
	var sync = false;
  import("./empty?e" /* webpackChunkName = "import-named-chunk" */).then(function(result){
    import("./empty?f" /* webpackChunkName = "import-named-chunk" */).then(function(result){
			sync.should.be.ok();
    }).catch(function(err){
      done(err);
    });
    import("./empty?g" /* webpackChunkName = "import-named-chunk-2" */).then(function(result){
			sync.should.not.be.ok();
			done();
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
  import("./e" + mpty + "2" /* webpackChunkName = "context-named-chunk" */).then(function(result) {
    import("./e" + mpty + "3" /* webpackChunkName = "context-named-chunk" */).then(function(result){
			sync.should.be.ok();
    }).catch(function(err){
      done(err);
    });
    import("./e" + mpty + "4" /* webpackChunkName = "context-named-chunk-2" */).then(function(result){
			sync.should.not.be.ok();
			done();
    }).catch(function(err){
      done(err);
    });
		sync = true;
    Promise.resolve().then(function(){}).then(function(){}).then(function(){
      sync = false;
    });
	});
});
