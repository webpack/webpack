it("should be able to use eager mode", function() {
	function load(name) {
		return import(/* webpackMode: "eager" */ "./dir1/" + name);
	}
	return testChunkLoading(load, true, true);
});

it("should be able to use lazy-once mode", function() {
	function load(name) {
		return import(/* webpackMode: "lazy-once" */ "./dir2/" + name);
	}
	return testChunkLoading(load, false, true);
});

it("should be able to use lazy-once mode with name", function() {
	function load(name) {
		return import(/* webpackMode: "lazy-once", webpackChunkName: "name-lazy-once" */ "./dir3/" + name);
	}
	return testChunkLoading(load, false, true);
});

it("should be able to use lazy mode", function() {
	function load(name) {
		return import(/* webpackMode: "lazy" */ "./dir4/" + name);
	}
	return testChunkLoading(load, false, false);
});

it("should be able to use lazy mode with name", function() {
	function load(name) {
		return import(/* webpackMode: "lazy", webpackChunkName: "name-lazy" */ "./dir5/" + name);
	}
	return testChunkLoading(load, false, false);
});

it("should be able to use lazy mode with name and placeholder", function() {
	function load(name) {
		return import(/* webpackMode: "lazy", webpackChunkName: "name-lazy-[request]" */ "./dir6/" + name);
	}
	return testChunkLoading(load, false, false);
});

it("should be able to combine chunks by name", function() {
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
	return testChunkLoading(load, false, true);
});

it("should be able to use weak mode", function() {
	function load(name) {
		return import(/* webpackMode: "weak" */ "./dir8/" + name);
	}
	require("./dir8/a") // chunks served manually by the user
	require("./dir8/b")
	require("./dir8/c")
	return testChunkLoading(load, true, true);
});

it("should be able to use weak mode (without context)", function() {
	function load(name) {
		switch(name) {
			case "a":
				return import(/* webpackMode: "weak" */ "./dir9/a");
			case "b":
				return import(/* webpackMode: "weak" */ "./dir9/b");
			case "c":
				return import(/* webpackMode: "weak" */ "./dir9/c");
			default:
				throw new Error("Unexcepted test data");
		}
	}
	require("./dir9/a") // chunks served manually by the user
	require("./dir9/b")
	require("./dir9/c")
	return testChunkLoading(load, true, true);
});

it("should not find module when mode is weak and chunk not served elsewhere", function() {
	var name = "a";
	return import(/* webpackMode: "weak" */ "./dir10/" + name)
		.catch(function(e) {
			expect(e).toMatchObject({ message: /not available/, code: /MODULE_NOT_FOUND/ });
		});
});

it("should not find module when mode is weak and chunk not served elsewhere (without context)", function() {
	return import(/* webpackMode: "weak" */ "./dir11/a")
		.catch(function(e) {
			expect(e).toMatchObject({ message: /not available/, code: /MODULE_NOT_FOUND/ });
		});
});

function testChunkLoading(load, expectedSyncInitial, expectedSyncRequested) {
	var sync = false;
	var syncInitial = true;
	var p = Promise.all([load("a"), load("b")]).then(function() {
		expect(syncInitial).toBe(expectedSyncInitial);
		sync = true;
		var p = Promise.all([
			load("a").then(function(a) {
				expect(a).toEqual({
					default: "a",
					[Symbol.toStringTag]: "Module"
				});
				expect(sync).toBe(true);
			}),
			load("c").then(function(c) {
				expect(c).toEqual({
					default: "c",
					[Symbol.toStringTag]: "Module"
				});
				expect(sync).toBe(expectedSyncRequested);
			})
		]);
		Promise.resolve().then(function(){}).then(function(){}).then(function(){}).then(function(){
			sync = false;
		});
		return p;
	});
	Promise.resolve().then(function(){}).then(function(){}).then(function(){}).then(function(){
		syncInitial = false;
	});
	return p;
}
