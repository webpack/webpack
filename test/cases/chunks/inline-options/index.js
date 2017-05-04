it("should be able to use eager mode", function(done) {
	function load(name) {
		return import(/* webpackMode: "eager" */"./dir1/" + name);
	}
	testChunkLoading(load, true, true, done);
});

it("should be able to use lazy-once mode", function(done) {
	function load(name) {
		return import(/* webpackMode: "lazy-once" */"./dir2/" + name);
	}
	testChunkLoading(load, false, true, done);
});

it("should be able to use lazy-once mode with name", function(done) {
	function load(name) {
		return import(/* webpackMode: "lazy-once", webpackChunkName: "name-lazy-once" */"./dir3/" + name);
	}
	testChunkLoading(load, false, true, done);
});

it("should be able to use lazy mode", function(done) {
	function load(name) {
		return import(/* webpackMode: "lazy" */"./dir4/" + name);
	}
	testChunkLoading(load, false, false, done);
});

it("should be able to use lazy mode with name", function(done) {
	function load(name) {
		return import(/* webpackMode: "lazy", webpackChunkName: "name-lazy" */"./dir5/" + name);
	}
	testChunkLoading(load, false, false, done);
});

it("should be able to use lazy mode with name and placeholder", function(done) {
	function load(name) {
		return import(/* webpackMode: "lazy", webpackChunkName: "name-lazy-[request]" */"./dir6/" + name);
	}
	testChunkLoading(load, false, false, done);
});

it("should be able to combine chunks by name", function(done) {
	function load(name) {
		switch(name) {
			case "a":
				return import(/* webpackMode: "eager" */ "./dir7/a");
			case "b":
				return import(/* webpackChunkName: "name-3" */ "./dir7/b");
			case "c":
				return import(/* webpackChunkName: "name-3" */ "./dir7/c");
			case "d":
				return import(/* webpackChunkName: "name-3" */ "./dir7/d");
			default:
				throw new Error("Unexcepted test data");
		}
	}
	testChunkLoading(load, false, true, done);
});

function testChunkLoading(load, expectedSyncInitial, expectedSyncRequested, done) {
	var sync = false;
	var syncInitial = true;
	Promise.all([load("a"), load("b")]).then(function() {
		syncInitial.should.be.eql(expectedSyncInitial);
		sync = true;
		Promise.all([
			load("a").then(function(a) {
				a.should.be.eql({ default: "a" });
				sync.should.be.eql(true);
			}),
			load("c").then(function(c) {
				c.should.be.eql({ default: "c" });
				sync.should.be.eql(expectedSyncRequested);
			})
		]).then(function() { done(); }, done);
		Promise.resolve().then(function(){}).then(function(){}).then(function(){}).then(function(){
			sync = false;
		});
	}).catch(done);
	Promise.resolve().then(function(){}).then(function(){}).then(function(){}).then(function(){
		syncInitial = false;
	});
}
