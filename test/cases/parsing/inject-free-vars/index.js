it("should inject the module object into a chunk (AMD1)", function(done) {
	require([], function() {
		expect(module.webpackPolyfill).toBe(1);
		done();
	});
});

it("should inject the module object into a chunk (AMD2)", function() {
	require([module.webpackPolyfill ? "./x1" : "./fail"]);
	expect(module.webpackPolyfill).toBe(1);
});

it("should inject the module object into a chunk (ensure)", function(done) {
	require.ensure([], function(require) {
		expect(module.webpackPolyfill).toBe(1);
		done();
	});
});
