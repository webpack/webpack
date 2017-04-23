it("should inject the module object into a chunk (AMD1)", function(done) {
	require([], function() {
		expect(module.webpackPolyfill).toEqual(1);
		done();
	});
});

it("should inject the module object into a chunk (AMD2)"/*, function() {
	require([module.webpackPolyfill ? "./x1" : "./fail"]);
}*/);

it("should inject the module object into a chunk (ensure)", function(done) {
	require.ensure([], function(require) {
		expect(module.webpackPolyfill).toEqual(1);
		done();
	});
});
